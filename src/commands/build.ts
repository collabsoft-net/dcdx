#!/usr/bin/env node

import { FSWatcher } from 'chokidar';
import { Command as Commander, InvalidOptionArgumentError, Option } from 'commander';
import { gracefulExit } from 'exit-hook';

import versions from '../../assets/versions.json';
import { ActionHandler } from '../helpers/ActionHandler';
import { AMPS } from '../helpers/amps';
import { FileWatcher } from '../helpers/FileWatcher';
import { TBuildOptions } from '../types/AMPS';

const program = new Commander();

const Command = () => {
  let quickReload: FSWatcher|null = null;

  return {
    action: async (options: TBuildOptions) => {
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

      const version = amps.getApplicationVersion();
      if (!version) {
        throw new Error('Failed to determine version from AMPS and no product version provided (--tag)');
      } else if (!versions[name].includes(version)) {
        throw new Error(`Product version '${version}' is invalid. Allowed choices are ${versions[name].join(', ')}.`);
      }

      if (!options.watch && options.ext) {
        throw new InvalidOptionArgumentError('Invalid argument "--ext"');
      } else if (!options.watch && options.install) {
        throw new InvalidOptionArgumentError('Invalid argument "--install"');
      } else if (!options.install && options.outputDirectory) {
        throw new InvalidOptionArgumentError('Invalid argument "--outputDirectory"');
      }

      const mavenOpts = program.args.slice();
      if (options.activateProfiles) {
        mavenOpts.push(...[ '-P', options.activateProfiles ]);
      }

      if (options.watch) {
        quickReload = FileWatcher(name, options, mavenOpts);
      }

      console.log(`Building Atlassian Data Center plugin for ${name}... 💃`);
      await amps.build(mavenOpts).then(() => {
        console.log(`Finished building Atlassian Data Center plugin for ${name}... 💪`);
      });
    },
    errorHandler: async () => {
      if (quickReload) {
        console.log(`Stopping filesystem watcher... ⏳`);
        await quickReload.close().catch(() => null);
      }
      console.log(`Successfully stopped all running processes 💪`);
    }
  }
}

program
  .name('dcdx build')
  .description(
`Build the Atlassian Data Center plugin using the Atlassian Maven Plugin Suite (AMPS) configuration.
If there is a running instance, it will try to install the plugin using QuickReload.

You can add Maven build arguments after the command options.`)
  .usage('[options] [...maven_arguments]')
  .allowUnknownOption(true)
  .showHelpAfterError(true)
  .addOption(new Option('-w, --watch', 'Watch for filesystem changes in the current working directory and rebuild plugin').default(false))
  .addOption(new Option('--ext <patterns...>', 'Glob patterns to use when watching for file changes (only available with --watch, defaults to **/*)'))
  .addOption(new Option('-i, --install', 'Install the plugin into a running instance of the host application (only available with --watch)'))
  .addOption(new Option('-o, --outputDirectory <directory>', 'Output directory where to look for generated JAR files (only available with --install, defaults to `target`)'))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the AMPS configuration'))
  .action(options => ActionHandler(program, Command(), options));

program.parseAsync(process.argv).catch(() => gracefulExit(1));

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit(1);
});


