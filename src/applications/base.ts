import axios from 'axios';
import { spawn } from 'child_process';
import { downAll, ps, upAll } from 'docker-compose/dist/v2.js';
import EventEmitter from 'events';
import { gracefulExit } from 'exit-hook';
import { existsSync, mkdirSync } from 'fs';
import { dump } from 'js-yaml';
import { homedir } from 'os';
import { join } from 'path';
import { cwd } from 'process';
import simpleGit from 'simple-git';

import { MSSQL } from '../databases/mssql';
import { MySQL } from '../databases/mysql';
import { Postgres } from '../databases/postgres';
import { network } from '../helpers/network';
import { ApplicationOptions } from '../types/ApplicationOptions';
import { DatabaseEngine } from '../types/DatabaseEngine';
import { DockerComposeV3, Service } from '../types/DockerComposeV3';
import { SupportedApplications } from '../types/SupportedApplications';
import { SupportedDatabaseEngines } from '../types/SupportedDatabaseEngines';

const basedir = join(homedir(),'.dcdx');

export abstract class Base extends EventEmitter {

  abstract get name(): SupportedApplications;
  abstract get database(): DatabaseEngine;
  abstract get logFilePath(): string;

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(protected options: ApplicationOptions) {
    super();
  }

  // ------------------------------------------------------------------------------------------ Properties

  protected get baseUrl(): string {
    const baseUrl = `http://localhost:${this.options.port}`;
    return this.options.contextPath ? `${baseUrl}/${this.options.contextPath}` : baseUrl;
  }

  // ------------------------------------------------------------------------------------------ Public Methods

  getDatabaseEngine(name: SupportedDatabaseEngines): DatabaseEngine {
    switch (name) {
      case 'postgresql': return new Postgres();
      case 'mssql': return new MSSQL();
      case 'mysql': return new MySQL();
    }
  }

  async start() {
    await this.stop();
    await this.build(this.options.version);

    await this.database.start(this.name, this.options.version);
    await this.up();
  }

  async stop() {
    await this.database.stop();
    await this.down();
  }

  // ------------------------------------------------------------------------------------------ Protected Methods

  protected abstract getService(): Service;

  protected async isApplicationReady(): Promise<boolean> {
    try {
      const response = await axios.get<{ state: string }>(`${this.baseUrl}/status`, { validateStatus: () => true }).catch(() => null);

      if (response) {
        if (response.status === 200) {
          const { data } = response;
          if (data.state === 'FIRST_RUN') {
            console.log(`The application ${this.name} is ready on ${this.baseUrl} 🎉`);
            return true;
          }
        }
      }

      return false;
    } catch (err) {
      return false;
    }
  }

  // ------------------------------------------------------------------------------------------ Private Methods

  private getDockerComposeConfig(): DockerComposeV3 {
    return {
      version: '3.8',
      services: {
        [this.name]: this.getService()
      },
      networks: {
        'shared': network
      }
    }
  }

  private async up() {
    const config = this.getDockerComposeConfig();
    const configAsString = dump(config);

    await upAll({
      cwd: cwd(),
      configAsString,
      log: true,
    });

    this.emit(`${this.name}:up`);
    const isAvailable = await this.waitUntilReady();
    if (!isAvailable) {
      console.log(`Failed to start ${this.name} ⛔`);
    } else {
      this.emit(`${this.name}:ready`);
      await this.tailApplicationLogs();
    }

    gracefulExit(0);
  }

  private async down() {
    const configAsString = dump(this.getDockerComposeConfig());

    await downAll({
      cwd: cwd(),
      configAsString,
      commandOptions: [ '-v', '--remove-orphans', '--rmi', 'local' ],
      log: true
    });

    this.emit(`${this.name}:stopped`);
  }

  private async getServiceState() {
    const configAsString = dump(this.getDockerComposeConfig());
    const result = await ps({ configAsString, log: false, commandOptions: [ '--all' ] });
    return result.data.services.find(item => item.name.includes(this.name));
  }

  private async waitUntilReady(): Promise<boolean>;
  private async waitUntilReady(count: number): Promise<boolean>;
  private async waitUntilReady(count: number = 0): Promise<boolean> {
    console.log(`Waiting for ${this.name} to become available... ${count}s`);
    const service = await this.getServiceState();
    const isRunning = service && service.state.toLowerCase().startsWith('up');
    const isReady = isRunning && await this.isApplicationReady();

    if (isReady) {
      return true;
    }

    if (count >= 300) {
      console.error(`A timeout occurred while waiting for ${this.name} to become available ⛔`);
      if (service) {
        await this.showDockerLogs(service.name);
      }
      return false;
    }

    await new Promise<void>(resolve => setTimeout(resolve, 1000));
    return this.waitUntilReady(count + 1);
  }

  private getDockerRepositoryUrl() {
    const suffix = this.name === 'jira'
      ? 'atlassian-jira'
      : this.name === 'bamboo'
        ? `${this.name}-server`
        : `atlassian-${this.name}-server`;
    return `https://bitbucket.org/atlassian-docker/docker-${suffix}.git`;
  }

  private async build(version: string) {
    const repositoryUrl = this.getDockerRepositoryUrl();
    const checkoutPath = join(basedir, this.name, 'source');

    if (!existsSync(checkoutPath)) {
      mkdirSync(join(basedir, this.name), { recursive: true });
      await simpleGit().clone(repositoryUrl, checkoutPath, { '--recurse-submodule': null });
    } else {
      await simpleGit({ baseDir: checkoutPath }).pull({ '--recurse-submodule': null });
    }

    await new Promise<void>((resolve, reject) => {
      const docker = spawn(
        'docker',
        [ 'build', '-t', `dcdx/${this.name}:${version}`, '--build-arg', `${this.name.toUpperCase()}_VERSION=${version}`, '.'],
        { cwd: checkoutPath }
      );
      docker.stdout.on('data', (lines: Buffer) => { console.log(lines.toString('utf-8').trim()); });
      docker.stderr.on('data', (lines: Buffer) => { console.log(lines.toString('utf-8').trim()); });
      docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
    });
  }

  private async tailApplicationLogs() {
    const service = await this.getServiceState();
    const isRunning = service && service.state.toLowerCase().startsWith('up');

    if (isRunning) {
      await this.showApplicationLogs(service.name).catch(() => null);
    }
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

  private async showApplicationLogs(service: string) {
    return new Promise<void>((resolve, reject) => {
      const docker = spawn(
        'docker',
        [ 'exec', '-i', service, `tail`, `-F`, `-n`, `5000`, this.logFilePath ],
        { cwd: cwd() }
      );
      docker.stdout.on('data', (lines: Buffer) => { console.log(lines.toString('utf-8').trim()); });
      docker.stderr.on('data', (lines: Buffer) => { console.log(lines.toString('utf-8').trim()); });
      docker.on('SIGINT', () => resolve());
      docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
    });
  }

}