import { spawn } from 'child_process';
import { upAll } from 'docker-compose';
import { downAll, ps } from 'docker-compose/dist/v2.js';
import EventEmitter from 'events';
import { gracefulExit } from 'exit-hook';
import { dump } from 'js-yaml';
import { cwd } from 'process';
import { ConnectionAcquireTimeoutError, ConnectionError, ConnectionRefusedError, ConnectionTimedOutError, Dialect, Sequelize, TimeoutError } from 'sequelize';

import { network } from '../helpers/network';
import { DatabaseEngine } from '../types/DatabaseEngine';
import { DatabaseOptions } from '../types/DatabaseOptions';
import { DockerComposeV3, Service } from '../types/DockerComposeV3';
import { SupportedDatabaseDrivers } from '../types/SupportedDatabaseDrivers';
import { SupportedDatabaseEngines } from '../types/SupportedDatabaseEngines';

export abstract class Base extends EventEmitter implements DatabaseEngine {

  private sequelize: Sequelize|null = null;

  abstract get name(): SupportedDatabaseEngines;
  abstract get driver(): SupportedDatabaseDrivers;
  abstract get version(): string;
  abstract get url(): string;

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(public options: DatabaseOptions) {
    super();
  }

  // ------------------------------------------------------------------------------------------ Public Methods

  async run(sql: string | { query: string; values: unknown[] }, logging?: boolean): Promise<[unknown[], unknown]|null> {
    try {
      if (!this.sequelize) throw new Error('Database connection does not exist');
      await this.sequelize.query(sql, { logging });
    } catch (err) {
      console.error('An error occurred while trying to run the following SQL query:', sql, err);
      gracefulExit();
    }
    return null;
  }

  async start(): Promise<void> {
    console.log(`Starting instance of ${this.name} ⏳`);

    await this.stop();
    await this.up();

    this.emit(`${this.name}:up`);
    const isAvailable = await this.waitUntilReady();
    if (!isAvailable) {
      console.log(`Failed to start database ${this.name} ⛔`);
      gracefulExit(0);
    } else {
      console.log(`Database is ready and accepting connections on localhost:${this.options.port} 🗄️`);
      await this.onDatabaseReady();
      this.emit('db:ready');

      if (this.options.logging) {
        const service = await this.getServiceState();
        if (service) {
          await this.showDockerLogs(service.name);
        }
      }
    }
  }

  async stop(): Promise<void> {
    await this.down();
    this.emit('db:stopped');
  }

  // ------------------------------------------------------------------------------------------ Protected Methods

  protected abstract getService(): Service;
  protected async onDatabaseReady(): Promise<void> {}

  // ------------------------------------------------------------------------------------------ Private Methods

  private getDockerComposeConfig(): DockerComposeV3 {
    return {
      version: '3.8',
      services: {
        'db': this.getService()
      },
      networks: {
        'shared': network
      }
    }
  }

  private async up() {
    const configAsString = dump(this.getDockerComposeConfig());

    return upAll({
      cwd: cwd(),
      configAsString,
      log: true
    });
  }

  private async down() {
    const configAsString = dump(this.getDockerComposeConfig());

    return downAll({
      cwd: cwd(),
      configAsString,
      commandOptions: [ '-v', '--remove-orphans', '--rmi', 'local' ],
      log: true
    });
  }

  private async waitUntilReady(): Promise<boolean> {
    try {
      // We need to use 'master' for mssql because it does not initialize the database on start
      const database = this.name === 'mssql' ? 'master' : this.options.database;
      this.sequelize = new Sequelize(database, this.options.username, this.options.password, {
        host: 'localhost',
        port: this.options.port,
        dialect: this.name.replace('postgresql', 'postgres') as Dialect,
        retry: {
          max: 30,
          match: [ConnectionError, TimeoutError, ConnectionTimedOutError, ConnectionRefusedError, ConnectionAcquireTimeoutError],
          backoffBase: 1000,
          backoffExponent: 1
        },
        logging: false
      });

      return this.sequelize.authenticate().then(() => true).catch((err) => {
        console.log(err);
        return false;
      });
    } catch (err) {
      return false;
    }
  }

  private async getServiceState() {
    const configAsString = dump(this.getDockerComposeConfig());
    const result = await ps({ configAsString, log: false, commandOptions: [ '--all' ] });
    return result.data.services.find(item => item.name.includes(this.name));
  }

  private async showDockerLogs(service: string) {
    return new Promise<void>((resolve, reject) => {
      const docker = spawn(
        'docker',
        [ 'logs', '-f', '-n', '5000', service ],
        { cwd: cwd() }
      );
      docker.stdout.on('data', (lines: Buffer) => { console.log(lines.toString('utf-8').trim()); });
      docker.stderr.on('data', (lines: Buffer) => { console.log(lines.toString('utf-8').trim()); });
      docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
    });
  }
}