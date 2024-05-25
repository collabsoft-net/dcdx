import axios from 'axios';
import { spawn } from 'child_process';
import { downAll, ps, stop, upAll } from 'docker-compose/dist/v2.js';
import { gracefulExit } from 'exit-hook';
import { existsSync, mkdirSync } from 'fs';
import { dump } from 'js-yaml';
import { homedir } from 'os';
import { join } from 'path';
import { cwd } from 'process';
import simpleGit from 'simple-git';

import { getDatabaseEngine } from '../helpers/getDatabaseEngine';
import { getZodDefaults } from '../helpers/getZodDefaults';
import { network } from '../helpers/network';
import { Application,TApplicationOptions,TSupportedApplications } from '../types/Application';
import { DatabaseEngine, DatabaseOptions, MSSQLOptions, MySQLOptions, PostgreSQLOptions, SupportedDatabaseEngines, TSupportedDatabaseEngines } from '../types/Database';
import { DockerComposeV3, Service } from '../types/DockerComposeV3';

const basedir = join(homedir(),'.dcdx');

export abstract class Base implements Application {

  abstract get name(): TSupportedApplications;
  abstract get database(): DatabaseEngine;
  abstract get logFilePath(): string;

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(protected options: TApplicationOptions) {}

  // ------------------------------------------------------------------------------------------ Properties

  protected get baseUrl(): string {
    let baseUrl = `http://localhost`;
    if (this.options.port) {
      baseUrl += `:${this.options.port}`;
    }
    return this.options.contextPath ? `${baseUrl}/${this.options.contextPath}` : baseUrl;
  }

  // ------------------------------------------------------------------------------------------ Public Methods

  async start(): Promise<void> {
    if (this.options.clean) {
      await this.down();
    }

    await this.build(this.options.tag);
    await this.database.start(this.options.clean);
    await this.up();
  }

  async stop(): Promise<void> {
    await this.database.stop(this.options.prune);
    if (this.options.prune) {
      await this.down();
    } else {
      const configAsString = dump(this.getDockerComposeConfig());
      await stop({
        cwd: this.options.cwd || cwd(),
        configAsString,
        log: true
      });
    }
  }

  async reset(): Promise<void> {
    await this.database.stop(true);
    await this.down();
  }

  // ------------------------------------------------------------------------------------------ Protected Methods

  protected abstract getService(): Service;

  protected getJVMArgs(): Array<string> {
    const JVM_SUPPORT_RECOMMENDED_ARGS = [];
    JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dupm.plugin.upload.enabled=true');

    if (this.options.debug) {
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Djira.dev.mode=true');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Datlassian.dev.mode=true');
    }

    if (this.options.watch) {
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dquickreload.dirs=/opt/quickreload');
    }

    return JVM_SUPPORT_RECOMMENDED_ARGS;
  }


  protected async isApplicationReady(): Promise<boolean> {
    try {
      const response = await axios.get<{ state: string }>(`${this.baseUrl}/status`, { validateStatus: () => true }).catch(() => null);
      if (response) {
        if (response.status === 200) {
          const { data } = response;
          if (data.state === 'FIRST_RUN' || data.state === 'RUNNING') {
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

  protected getDatabaseEngine(name: TSupportedDatabaseEngines): DatabaseEngine {
    return getDatabaseEngine(DatabaseOptions.parse({
      ...this.getDefaultOptions(name),
      name,
      cwd: this.options.cwd
    }));
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
      cwd: this.options.cwd || cwd(),
      configAsString,
      log: true,
    });

    const isAvailable = await this.waitUntilReady();
    if (!isAvailable) {
      console.log(`Failed to start ${this.name} ⛔`);
    } else {
      await this.tailApplicationLogs();
    }

    // We are exiting with an error code
    // This is to trigger a graceful shut down of the application
    gracefulExit(1);
  }

  private async down() {
    const configAsString = dump(this.getDockerComposeConfig());
    await downAll({
      cwd: this.options.cwd || cwd(),
      configAsString,
      commandOptions: [ '-v', '--remove-orphans', '--rmi', 'local' ],
      log: true
    });
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
        { cwd: checkoutPath, stdio: 'inherit' }
      );
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
        { cwd: this.options.cwd || cwd(), stdio: 'inherit' }
      );
      docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
    });
  }

  private async showApplicationLogs(service: string) {
    return new Promise<void>((resolve, reject) => {
      const docker = spawn(
        'docker',
        [ 'exec', '-i', service, `tail`, `-F`, `-n`, `5000`, this.logFilePath ],
        { cwd: this.options.cwd || cwd(), stdio: 'inherit' }
      );
      docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
    });
  }

  private getDefaultOptions(name: TSupportedDatabaseEngines) {
    switch (name) {
      case SupportedDatabaseEngines.Values.postgresql:
        return getZodDefaults(PostgreSQLOptions);
      case SupportedDatabaseEngines.Values.mysql:
        return getZodDefaults(MySQLOptions);
      case SupportedDatabaseEngines.Values.mssql:
        return getZodDefaults(MSSQLOptions);
    }
  }

}