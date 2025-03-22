import axios from 'axios';
import { spawn } from 'child_process';
import { downAll, logs, ps, stop, upAll } from 'docker-compose/dist/v2.js';
import { gracefulExit } from 'exit-hook';
import { existsSync, mkdirSync } from 'fs';
import { dump } from 'js-yaml';
import { homedir } from 'os';
import { join } from 'path';
import { arch,cwd } from 'process';
import semver from 'semver';
import simpleGit from 'simple-git';

import { getConfig } from '../helpers/getConfig';
import { getDatabaseEngine } from '../helpers/getDatabaseEngine';
import { getZodDefaults } from '../helpers/getZodDefaults';
import { network } from '../helpers/network';
import { setupHost } from '../helpers/setupHost';
import { Application,TApplicationOptions,TSupportedApplications } from '../types/Application';
import { DatabaseEngine, DatabaseOptions, MSSQLOptions, MySQLOptions, PostgreSQLOptions, SupportedDatabaseEngines, TSupportedDatabaseEngines } from '../types/Database';
import { DockerComposeV3, Service } from '../types/DockerComposeV3';

const basedir = join(homedir(),'.dcdx');

export abstract class Base implements Application {

  database: DatabaseEngine;
  abstract get name(): TSupportedApplications;
  abstract get logFilePath(): string;

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(protected options: TApplicationOptions) {
    this.database = this.getDatabaseEngine(options.database, options.databaseTag);
  }

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

    if (this.isBuidRequired()) {
      await this.build(this.options.tag);
    }

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
    const JVM_SUPPORT_RECOMMENDED_ARGS = this.options.jvm ? [ this.options.jvm ] : [];
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
      const response = await axios.get<{ state: string }>(`${this.baseUrl}/status`, { validateStatus: () => true });
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

  protected getDatabaseEngine(name: TSupportedDatabaseEngines, tag?: string): DatabaseEngine {
    return getDatabaseEngine(DatabaseOptions.parse({
      ...this.getDefaultOptions(name),
      name,
      cwd: this.options.cwd
    }), tag);
  }

  protected getDockerBaseTag() {
    if (this.isBuidRequired()) {
      return `dcdx/${this.name}:${this.options.tag}`;
    } else if (this.name === 'jira') {
      return `atlassian/jira-software:${this.options.tag}`;
    } else {
      return `atlassian/${this.name}:${this.options.tag}`;
    }
  }

  // ------------------------------------------------------------------------------------------ Private Methods

  private getDockerComposeConfig(): DockerComposeV3 {
    return {
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
      const service = await this.getServiceState();
      const isRunning = service && service.state.toLowerCase().startsWith('up');
      if (!isRunning) {
        console.log(`Failed to start ${this.name} ⛔`);
        await logs(Object.keys(config.services), {
          cwd: this.options.cwd || cwd(),
          configAsString,
          log: true
        });
      } else {
        console.log(`Could not confirm state of ${this.name}, but the container is running. Please consult the application logs 👇`);
        await this.tailApplicationLogs();
      }
    }

    if (this.options.configure) {
      const config = await getConfig(undefined, this.options.cwd);
      const success = await setupHost(this.options.name, config);

      if (success) {
        // Tail application logs until we receive the TERM signal
        await this.tailApplicationLogs();
      }
    } else {
      // Tail application logs until we receive the TERM signal
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
    const result = await ps({
      cwd: this.options.cwd || cwd(),
      configAsString,
      commandOptions: [ '--all' ],
      log: false
    });

    return result.data.services.find(item => {
      const parts = item.name.split('-');
      const service = parts[parts.length - 2];
      return service === this.name;
    });
  }

  private async waitUntilReady(): Promise<boolean>;
  private async waitUntilReady(count: number): Promise<boolean>;
  private async waitUntilReady(count: number = 0): Promise<boolean> {
    console.log(`Waiting for ${this.name} to become available... ${count}s`);
    const service = await this.getServiceState();
    if (service) {
      const isRunning = service && service.state.toLowerCase().startsWith('up');
      const isReady = isRunning && await this.isApplicationReady();

      if (isReady) {
        return true;
      } else if (count >= 120) {
        return false;
      }

      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      return this.waitUntilReady(count + 1);
    } else if (count < 10) {
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      return this.waitUntilReady(count + 1);
    } else {
      return false;
    }
  }

  private isBuidRequired() {
    if (this.options.tag.toLowerCase() === 'latest') {
      return false;
    }

    if (arch === 'arm' || arch === 'arm64') {
      try {
        const semVerVersion = this.getSemanticVersion()
        if (semVerVersion) {
          if (this.name === 'jira' || this.name === 'bamboo') {
            return semver.lt(semVerVersion, '9.0.0');
          } else if (this.name === 'confluence') {
            return semver.lt(semVerVersion, '8.0.0');
          } else if (this.name === 'bitbucket') {
            return semver.lt(semVerVersion, '8.2.0');
          }
        }
      } catch (err) {
        return true;
      }
    }

    return true;
  }

  private getSemanticVersion(version?: string) {
    const tag = version || this.options.tag;
    const sanitizedVersion = tag.includes('-')
      ? tag.slice(0, tag.indexOf('-'))
      : tag;

    return semver.coerce(sanitizedVersion);
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

    const baseImage = this.getBaseImageFor(version);

    await new Promise<void>((resolve, reject) => {
      const docker = spawn(
        'docker',
        [
          'build',
          '-t', `dcdx/${this.name}:${version}`,
          '--build-arg', `${this.name.toUpperCase()}_VERSION=${version}`,
          '--build-arg', `BASE_IMAGE=${baseImage}`,
          '.'
        ],
        { cwd: checkoutPath, stdio: 'inherit' }
      );
      docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
    });
  }

  private getDockerRepositoryUrl() {
    const suffix = this.name === 'jira'
      ? 'atlassian-jira'
      : this.name === 'bamboo'
        ? `${this.name}-server`
        : `atlassian-${this.name}-server`;
    return `https://bitbucket.org/atlassian-docker/docker-${suffix}.git`;
  }

  private async tailApplicationLogs() {
    const service = await this.getServiceState();
    const isRunning = service && service.state.toLowerCase().startsWith('up');

    if (isRunning) {
      await this.showApplicationLogs(service.name).catch(() => null);
    }
  }

  private getBaseImageFor(version: string) {
    try {
      const semVerVersion = this.getSemanticVersion(version);
      if (semVerVersion) {
        if (this.name === 'jira') {
          if (semver.lt(semVerVersion, '9.7.0')) {
            return 'adoptopenjdk/openjdk8:slim';
          }
        } else if (this.name === 'confluence') {
          if (semver.lt(semVerVersion, '7.18.0')) {
            return 'adoptopenjdk/openjdk8:slim';
          } else if (semver.lt(semVerVersion, '8.0.0')) {
            return 'adoptopenjdk/openjdk11:slim';
          }
        } else if (this.name === 'bitbucket') {
          if (semver.lt(semVerVersion, '8.17.0')) {
            return 'adoptopenjdk/openjdk8:slim';
          } else if (semver.lt(semVerVersion, '9.4.0')) {
            return 'adoptopenjdk/openjdk11:slim';
          }
        } else if (this.name === 'bamboo') {
          if (semver.lt(semVerVersion, '9.1.0')) {
            return 'adoptopenjdk/openjdk8:slim';
          }
        }
      }
    } catch (_ignored) {
      return 'eclipse-temurin:17-noble';
    }

    return 'eclipse-temurin:17-noble';
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