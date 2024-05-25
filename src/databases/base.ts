import { spawn } from 'child_process';
import { downAll, ps, stop,upAll } from 'docker-compose/dist/v2.js';
import { gracefulExit } from 'exit-hook';
import { dump } from 'js-yaml';
import { ConnectionAcquireTimeoutError, ConnectionError, ConnectionRefusedError, ConnectionTimedOutError, Dialect, Sequelize, TimeoutError } from 'sequelize';

import { network } from '../helpers/network';
import { DatabaseEngine, TDatabaseOptions } from '../types/Database';
import { DockerComposeV3, Service } from '../types/DockerComposeV3';

export abstract class Base implements DatabaseEngine {

  private sequelize: Sequelize;

  abstract get url(): string;

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(public options: TDatabaseOptions) {
    // We need to use 'master' for mssql because it does not initialize the database on start
    const database = this.options.name === 'mssql' ? 'master' : this.options.database;
    this.sequelize = new Sequelize(database, this.options.username, this.options.password, {
      host: 'localhost',
      port: this.options.port,
      dialect: this.options.name.replace('postgresql', 'postgres') as Dialect,
      retry: {
        max: 30,
        match: [ConnectionError, TimeoutError, ConnectionTimedOutError, ConnectionRefusedError, ConnectionAcquireTimeoutError],
        backoffBase: 1000,
        backoffExponent: 1
      },
      logging: false
    });
  }

  // ------------------------------------------------------------------------------------------ Public Methods

  async run(sql: string | { query: string; values: unknown[] }, logging?: boolean): Promise<void> {
    try {
      await this.sequelize.query(sql, { logging });
    } catch (err) {
      console.error('An error occurred while trying to run the following SQL query:', sql, err);
      throw err;
    }
  }

  async start(clean = this.options.clean): Promise<void> {
    console.log(`Starting instance of ${this.options.name}... 💃`);

    if (clean) {
      await this.down();
    }

    await this.up();

    const isAvailable = await this.waitUntilReady();
    if (!isAvailable) {
      console.log(`Failed to verify status of ${this.options.name} ⛔`);
      gracefulExit(1);
    } else {
      console.log(`Database is ready and accepting connections on localhost:${this.options.port} 🗄️`);
      try {
        await this.onDatabaseReady();

        if (this.options.verbose) {
          const service = await this.getServiceState();
          if (service) {
            await this.showDockerLogs(service.name);
          }
        }
      } catch (err) {
        gracefulExit(1);
      }
    }
  }

  async stop(prune = this.options.prune): Promise<void> {
    if (prune) {
      await this.down();
    } else {
      const configAsString = dump(this.getDockerComposeConfig());
      await stop({
        configAsString,
        log: true
      });
    }
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
      configAsString,
      log: true
    });
  }

  private async down() {
    const configAsString = dump(this.getDockerComposeConfig());
    return downAll({
      configAsString,
      commandOptions: [ '-v', '--remove-orphans', '--rmi', 'local' ],
      log: true
    });
  }

  private async waitUntilReady(): Promise<boolean> {
    return this.sequelize.authenticate().then(() => true).catch(() => false);
  }

  private async getServiceState() {
    const configAsString = dump(this.getDockerComposeConfig());
    const result = await ps({ configAsString, log: false, commandOptions: [ '--all' ] });
    return result.data.services.find(item => item.name.includes(this.options.name));
  }

  private async showDockerLogs(service: string) {
    return new Promise<void>((resolve, reject) => {
      const docker = spawn(
        'docker',
        [ 'logs', '-f', '-n', '5000', service ],
        { stdio: 'inherit' }
      );
      docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
    });
  }
}