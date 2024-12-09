#!/usr/bin/env node

import { FSWatcher } from 'chokidar';
import { Command as Commander, InvalidOptionArgumentError, Option } from 'commander';
import { gracefulExit } from 'exit-hook';

import { ActionHandler } from '../helpers/ActionHandler';
import { AMPS } from '../helpers/amps';
import { FileWatcher } from '../helpers/FileWatcher';
import { getApplication } from '../helpers/getApplication';
import { getVersions } from '../helpers/getVersions';
import { TDebugOptions } from '../types/AMPS';
import { Application } from '../types/Application';
import { SupportedDatabaseEngines } from '../types/Database';

const program = new Commander();
const versions = getVersions();

const Command = () => {
  let instance: Application|null = null;
  let quickReload: FSWatcher|null = null;

  return {
    action: (options: TDebugOptions) => {
      return new Promise<void>((resolve, reject) => {
        const amps = new AMPS({
          cwd: options.cwd,
          profiles: options.activateProfiles?.split(',') || []
        });

        if (!amps.isAtlassianPlugin()) {
          throw new Error('Unable to find an Atlassian Plugin project in the current directory 🤔');
        }

        const name = amps.getApplication();
        if (!name) {
          throw new Error('The Atlassian Plugin project does not contain an AMPS configuration, unable to detect product 😰');
        }

        if (!options.tag) {
          const version = amps.getApplicationVersion();
          if (!version) {
            throw new Error('Failed to determine version from AMPS and no product version provided (--tag)');
          } else {
            options.tag = version;
          }
        }

        if (!versions[name].includes(options.tag)) {
          throw new Error(`Product version '${options.tag}' is invalid. Allowed choices are ${versions[name].join(', ')}.`);
        }

        if (options.databaseTag && !versions[options.database].includes(options.databaseTag)) {
          throw new Error(`Database tag '${options.databaseTag}' is invalid. Allowed choices are ${versions[options.database].join(', ')}.`);
        }

        if (options.obr && !options.username) {
          throw new InvalidOptionArgumentError('Missing argument "--username", required for installing OBR artifacts');
        } else if (options.obr && !options.password) {
          throw new InvalidOptionArgumentError('Missing argument "--password", required for installing OBR artifacts');
        }

        const mavenOpts = program.args.slice();
        mavenOpts.push(...options.activateProfiles ? [ '-P', options.activateProfiles ] : []);
        quickReload = FileWatcher(name, options, mavenOpts);

        instance = getApplication({ ...options, name });
        console.log(`Starting ${instance.name}... 💃`);
        instance.start().then(resolve).catch(reject);
      });
    },
    errorHandler: async () => {
      if (quickReload) {
        console.log(`Stopping filesystem watcher... ⏳`);
        await quickReload.close();
      }

      if (instance) {
        console.log(`Stopping ${instance.name}... 💔`);
        await instance.stop().catch(() => null);
      }

      console.log(`Successfully stopped all running processes 💪`);
    }
  }
}

program
  .name('dcdx debug')
  .description(
`Start the host application in dev mode based on the Atlassian Maven Plugin Suite (AMPS) configuration.
AMPS configuration can be overridden by using any of the command-line options below.

This command will automatically watch for file changes and install the app in the running application.

You can add Maven build arguments after the command options`)
  .usage('[options] [...maven_arguments]')
  .addOption(new Option('-t, --tag <name>', 'The Docker tag of the host application'))
  .addOption(new Option('-d, --database <name>', 'The database engine on which the host application will run').choices(Object.values(SupportedDatabaseEngines.Values)).default(SupportedDatabaseEngines.Values.postgresql))
  .addOption(new Option('--database-tag <name>', 'The Docker tag of the database engine'))
  .addOption(new Option('-p, --port <port>', 'The HTTP port on which the host application will be accessible').default('80'))
  .addOption(new Option('-c, --contextPath <contextPath>', 'The context path on which the host application will be accessible'))
  .addOption(new Option('--xms <value>', 'JVM minimum heap size').default('1024m'))
  .addOption(new Option('--xmx <value>', 'JVM maximum heap size').default('1024m'))
  .addOption(new Option('--ext <patterns...>', 'Glob patterns to use while watching for file changes (defaults to **/*)'))
  .addOption(new Option('-o, --outputDirectory <directory>', 'Output directory where to look for generated JAR files (defaults to `target`)'))
  .addOption(new Option('--obr', 'Upload generated OBR file instead of JAR file when installing the app').default(false))
  .addOption(new Option('--username <username>', 'The username of the administrator (required with --obr)'))
  .addOption(new Option('--password <password>', 'The password of the administrator (required with --obr)'))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the AMPS configuration'))
  .addOption(new Option('--exec <command>', 'Build command to run instead of Maven'))
  .addOption(new Option('--clean', 'Remove data files before starting the database').default(false))
  .addOption(new Option('--prune', 'Remove data files when stopping the database').default(false))
  .action(options => ActionHandler(program, Command(), { ...options, debug: true, watch: true, install: true }))
  .allowUnknownOption(true)
  .showHelpAfterError(true);

program.parseAsync(process.argv).catch(() => gracefulExit(1));

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit();
});
