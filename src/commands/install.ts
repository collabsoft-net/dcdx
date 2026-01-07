#!/usr/bin/env node

import { FSWatcher } from 'chokidar';
import { Command as Commander, InvalidOptionArgumentError, Option } from 'commander';
import { gracefulExit } from 'exit-hook';
import { glob } from 'glob';
import { resolve } from 'path';
import { cwd } from 'process';

import { getAppLicense } from '../apt/helpers/getAppLicense';
import { ActionHandler } from '../helpers/ActionHandler';
import { AMPS } from '../helpers/amps';
import { FileWatcher } from '../helpers/FileWatcher';
import { getVersions } from '../helpers/getVersions';
import { installFromMPAC } from '../helpers/installFromMPAC';
import { installFromURL } from '../helpers/installFromURL';
import { installWithQuickReload } from '../helpers/installWithQuickReload';
import { isOfType } from '../helpers/isOfType';
import { PAT } from '../helpers/PAT';
import { TInstallFromAMPSArgs, TInstallFromMPACArgs, TInstallFromURLArgs } from '../types/Install';

const program = new Commander();
const versions = getVersions();

const Command = () => {
  let quickReload: FSWatcher|null = null;

  return {
    action: async (options: TInstallFromAMPSArgs|TInstallFromMPACArgs|TInstallFromURLArgs) => {
      if (isOfType<TInstallFromMPACArgs>(options, 'appKey')) {
        await installFromMPAC({
          appKey: options.appKey,
          baseUrl: options.baseUrl || 'http://localhost',
          username: options.username || 'admin',
          password: options.password || 'admin',
          pat: options.pat || PAT.token,
          license: await getAppLicense(options.license, true)
        });
      } else if (isOfType<TInstallFromURLArgs>(options, 'path')) {
        await installFromURL({
          path: options.path,
          baseUrl: options.baseUrl || 'http://localhost',
          username: options.username || 'admin',
          password: options.password || 'admin',
          pat: options.pat || PAT.token,
          license: await getAppLicense(options.license, true),
          verbose: true
        });
      } else {
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
        const license = await getAppLicense(options.license, true);
        await Promise.all(files.map(path => options.obr ? installFromURL({
          path,
          baseUrl: options.baseUrl || 'http://localhost',
          username: options.username || 'admin',
          password: options.password || 'admin',
          license
        }) : installWithQuickReload({
          path,
          product: name,
          baseUrl: 'http://localhost',
          username: options.username || 'admin',
          password: options.password || 'admin',
          license
        })));
      }
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
`Install the Atlassian Data Center plugin in the running host application cluster.
If there is a running instance, it will try to install the plugin using QuickReload or the UPM (for OBR).`)
  .showHelpAfterError(true)

program
  .command('fromAMPS', { isDefault: true, hidden: true })
  .addOption(new Option('-w, --watch', 'Watch for filesystem changes to JAR or OBR files in the current working directory').default(false))
  .addOption(new Option('-o, --outputDirectory <directory>', 'Output directory where to look for generated JAR or OBR files (defaults to `target`)'))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
  .addOption(new Option('--obr', 'Upload generated OBR file instead of JAR file when installing the app').default(false))
  .addOption(new Option('--username <username>', 'The username of an administrator account for the instance (required with --obr)'))
  .addOption(new Option('--password <password>', 'The password of an administrator account for the instance (required with --obr'))
  .addOption(new Option('--license <path_or_license>', 'The app license, either as a path to a file or the license itself'))
  .action(options => ActionHandler<TInstallFromAMPSArgs>(program, Command(), options));

program
  .command('mpac')
  .description('Install the app from the Atlassian Marketplace')
  .addOption(new Option('--appKey <key>', 'The key of the app to be installed'))
  .addOption(new Option('--baseUrl <url>', 'URL of the instance'))
  .addOption(new Option('--username <username>', 'The username of an administrator account for the instance'))
  .addOption(new Option('--password <password>', 'The password of an administrator account for the instance'))
  .addOption(new Option('--license <path_or_license>', 'The app license, either as a path to a file or the license itself'))
  .action(options => ActionHandler<TInstallFromMPACArgs>(program, Command(), options));

program
  .command('archive')
  .description('Install the app from your local machine or a URL')
  .argument('<path>', 'Path or URL where the app can be found')
  .addOption(new Option('--baseUrl <url>', 'URL of the instance'))
  .addOption(new Option('--username <username>', 'The username of an administrator account for the instance'))
  .addOption(new Option('--password <password>', 'The password of an administrator account for the instance'))
  .addOption(new Option('--pat <pat>', 'The Personal Access Token (PAT) of an administrator account for the instance'))
  .addOption(new Option('--license <path_or_license>', 'The app license, either as a path to a file or the license itself'))
  .action((path, options) => ActionHandler<TInstallFromURLArgs>(program, Command(), { path, ...options }));

program.parseAsync(process.argv).catch(() => gracefulExit(1));

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit(1);
});


