#!/usr/bin/env node

import { FSWatcher } from 'chokidar';
import { Command as Commander, InvalidOptionArgumentError, Option } from 'commander';
import { gracefulExit } from 'exit-hook';

import versions from '../../assets/versions.json';
import { ActionHandler } from '../helpers/ActionHandler';
import { AMPS } from '../helpers/amps';
import { FileWatcher } from '../helpers/FileWatcher';
import { getApplication } from '../helpers/getApplication';
import { TDebugOptions } from '../types/AMPS';
import { Application } from '../types/Application';
import { SupportedDatabaseEngines } from '../types/Database';

const program = new Commander();

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

        if (!options.watch && options.ext) {
          throw new InvalidOptionArgumentError('Invalid argument "--ext"');
        } else if (!options.watch && options.install) {
          throw new InvalidOptionArgumentError('Invalid argument "--install"');
        } else if (!options.install && options.outputDirectory) {
          throw new InvalidOptionArgumentError('Invalid argument "--outputDirectory"');
        } else if (!options.watch && options.activateProfiles) {
          throw new InvalidOptionArgumentError('Invalid argument "--activate-profiles"');
        } else if (!options.watch && options.cwd) {
          throw new InvalidOptionArgumentError('Invalid argument "--cwd"');
        }

        if (options.watch) {
          const mavenOpts = program.args.slice();
          mavenOpts.push(...options.activateProfiles ? [ '-P', options.activateProfiles ] : []);
          quickReload = FileWatcher(name, options, mavenOpts);
        }

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

You can add Maven build arguments after the command options`)
  .usage('[options] [...maven_arguments]')
  .addOption(new Option('-t, --tag <name>', 'The Docker tag of the host application'))
  .addOption(new Option('-d, --database <name>', 'The database engine on which the host application will run').choices(Object.values(SupportedDatabaseEngines.Values)).default(SupportedDatabaseEngines.Values.postgresql))
  .addOption(new Option('-p, --port <port>', 'The HTTP port on which the host application will be accessible').default('80'))
  .addOption(new Option('-c, --contextPath <contextPath>', 'The context path on which the host application will be accessible'))
  .addOption(new Option('--xms <value>', 'JVM minimum heap size').default('1024m'))
  .addOption(new Option('--xmx <value>', 'JVM maximum heap size').default('1024m'))
  .addOption(new Option('-w, --watch', 'Watch for filesystem changes in the current working directory and rebuild plugin').default(false))
  .addOption(new Option('--ext <patterns...>', 'Glob patterns to use when watching for file changes (only available with --watch, defaults to **/*)'))
  .addOption(new Option('-i, --install', 'Install the plugin into a running instance of the host application (only available with --watch)'))
  .addOption(new Option('-o, --outputDirectory <directory>', 'Output directory where to look for generated JAR files (only available with --install, defaults to `target`)'))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate (only available with --watch)'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the AMPS configuration (only available with --watch)'))
  .addOption(new Option('--clean', 'Remove data files before starting the database').default(false))
  .addOption(new Option('--prune', 'Remove data files when stopping the database').default(false))
  .action(options => ActionHandler(program, Command(), { ...options, debug: true }))
  .allowUnknownOption(true)
  .showHelpAfterError(true);

program.parseAsync(process.argv).catch(() => gracefulExit(1));

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit();
});
