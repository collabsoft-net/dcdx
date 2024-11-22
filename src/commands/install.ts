#!/usr/bin/env node

import { FSWatcher } from 'chokidar';
import { Command as Commander, InvalidOptionArgumentError, Option } from 'commander';
import { gracefulExit } from 'exit-hook';
import { glob } from 'glob';
import { resolve } from 'path';
import { cwd } from 'process';

import { ActionHandler } from '../helpers/ActionHandler';
import { AMPS } from '../helpers/amps';
import { FileWatcher } from '../helpers/FileWatcher';
import { getVersions } from '../helpers/getVersions';
import { Installer } from '../helpers/Installer';
import { TBuildOptions } from '../types/AMPS';

const program = new Commander();
const versions = getVersions();

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

      if (options.obr && !options.username) {
        throw new InvalidOptionArgumentError('Missing argument "--username", required for installing OBR artifacts');
      } else if (options.obr && !options.password) {
        throw new InvalidOptionArgumentError('Missing argument "--password", required for installing OBR artifacts');
      }

      if (options.watch) {
        quickReload = FileWatcher(name, options, [], true);
      }

      const outputDirectory = options.outputDirectory || 'target';
      const deliverableExtension = options.obr ? 'obr' : 'jar';
      const files = await glob(`${outputDirectory}/*.${deliverableExtension}`, { cwd: resolve(options.cwd || cwd()) });
      await Promise.all(files.map(path => Installer(name, path, options)));
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
  .name('dcdx install')
  .description(
`Install the Atlassian Data Center plugin using the Atlassian Maven Plugin Suite (AMPS) configuration.
If there is a running instance, it will try to install the plugin using QuickReload or the UPM (for OBR).`)
  .showHelpAfterError(true)
  .addOption(new Option('-w, --watch', 'Watch for filesystem changes to JAR or OBR files in the current working directory').default(false))
  .addOption(new Option('-o, --outputDirectory <directory>', 'Output directory where to look for generated JAR or OBR files (defaults to `target`)'))
  .addOption(new Option('--obr', 'Upload generated OBR file instead of JAR file when installing the app (only available with --install)').default(false))
  .addOption(new Option('--username <username>', 'The username of the administrator (required with --obr)'))
  .addOption(new Option('--password <password>', 'The password of the administrator (required with --obr)'))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the AMPS configuration'))
  .action(options => ActionHandler(program, Command(), { ...options, install: true }));

program.parseAsync(process.argv).catch(() => gracefulExit(1));

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit(1);
});


