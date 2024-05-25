#!/usr/bin/env node

import { Command as Commander,InvalidOptionArgumentError,Option } from 'commander';
import { gracefulExit } from 'exit-hook';

import versions from '../../assets/versions.json';
import { ActionHandler } from '../helpers/ActionHandler';
import { AMPS } from '../helpers/amps';
import { getApplication } from '../helpers/getApplication';
import { showHelpWithDefaultCommandOptions } from '../helpers/showHelpWithDefaultCommandOptions';
import { Application, SupportedApplications, TApplicationOptions } from '../types/Application';
import { SupportedDatabaseEngines } from '../types/Database';

const program = new Commander();

const Command = () => {
  let instance: Application|null = null;
  return {
    action: async (options: TApplicationOptions) => {
      const amps = new AMPS({
        cwd: options.cwd,
        profiles: options.activateProfiles?.split(',') || []
      });

      if (options.name && options.tag && options.activateProfiles) {
        throw new InvalidOptionArgumentError('Invalid argument "--activate-profiles"');
      } else if (options.name && options.tag && options.cwd) {
        throw new InvalidOptionArgumentError('Invalid argument "--cwd"');
      }

      if (!options.name && !amps.isAtlassianPlugin()) {
        throw new Error('Unable to find an Atlassian Plugin project in the current directory 🤔');
      }

      options.name = options.name || amps.getApplication();
      if (!options.name) {
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

      if (!versions[options.name].includes(options.tag)) {
        throw new Error(`Product version '${options.tag}' is invalid. Allowed choices are ${versions[options.name].join(', ')}.`);
      }

      instance = getApplication(options);
      console.log(`Stopping ${options.name} and ${options.database}... 💔`);
      return instance.stop().then(() => {
        console.log(`Stopped ${options.name} and ${options.database} 💪`);
      });
    },
    errorHandler: async (options: TApplicationOptions) => {
      if (instance) {
        console.log(`Stopping ${instance.name} and ${options.database}... 💔`);
        await instance.stop().catch(() => null);
        console.log(`Stopped ${instance.name} and ${options.database} 💪`);
      }
    }
  }
}

program
  .name('dcdx stop')
  .description(
`Stop the host application based on the Atlassian Maven Plugin Suite (AMPS) configuration.
If you wish to stop a specific host application running standalone, call this command with 'dcdx stop <name>'`)
  .addHelpText('afterAll','​') // there is a non-zero white space because the only reason to have this is to force a line break
  .configureHelp(showHelpWithDefaultCommandOptions)
  .allowUnknownOption(false)
  .allowExcessArguments(false)
  .showHelpAfterError(true);

program
  .command('fromAMPS', { isDefault: true, hidden: true })
  .addOption(new Option('-d, --database <name>', 'The database engine to stop').choices(Object.values(SupportedDatabaseEngines.Values)).default(SupportedDatabaseEngines.Values.postgresql))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory'))
  .action(options => ActionHandler(program, Command(), options));

program
  .command('bamboo')
  .description('Stop Atlassian Bamboo (standalone)')
  .addOption(new Option('-t, --tag <tag>', 'The Docker tag of Atlassian Bamboo').choices(versions[SupportedApplications.Values.bamboo]).default('latest'))
  .addOption(new Option('-d, --database <name>', 'The database engine to stop').choices(Object.values(SupportedDatabaseEngines.Values)).default(SupportedDatabaseEngines.Values.postgresql))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate (only available without --tag)'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory (only available without --tag)'))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedApplications.Values.bamboo }));

program
  .command('bitbucket')
  .description('Stop Atlassian Bitbucket (standalone)')
  .addOption(new Option('-t, --tag <tag>', 'The Docker tag of Atlassian Bitbucket').choices(versions[SupportedApplications.Values.bitbucket]).default('latest'))
  .addOption(new Option('-d, --database <name>', 'The database engine to stop').choices(Object.values(SupportedDatabaseEngines.Values)).default(SupportedDatabaseEngines.Values.postgresql))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate (only available without --tag)'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory (only available without --tag)'))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedApplications.Values.bitbucket }));

program
  .command('confluence')
  .description('Stop Atlassian Confluence (standalone)')
  .addOption(new Option('-t, --tag <tag>', 'The Docker tag of Atlassian Confluence').choices(versions[SupportedApplications.Values.confluence]).default('latest'))
  .addOption(new Option('-d, --database <name>', 'The database engine to stop').choices(Object.values(SupportedDatabaseEngines.Values)).default(SupportedDatabaseEngines.Values.postgresql))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate (only available without --tag)'))
  .addOption(new Option('--cwd <directory>', 'Specify the working director (only available without --tag)'))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedApplications.Values.confluence }));

program
  .command('jira')
  .description('Stop Atlassian Jira (standalone)')
  .addOption(new Option('-t, --tag <tag>', 'The Docker tag of Atlassian Jira').choices(versions[SupportedApplications.Values.jira]).default('latest'))
  .addOption(new Option('-d, --database <name>', 'The database engine to stop').choices(Object.values(SupportedDatabaseEngines.Values)).default(SupportedDatabaseEngines.Values.postgresql))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate (only available without --tag)'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory (only available without --tag)'))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedApplications.Values.jira }));

program.parseAsync(process.argv).catch(() => gracefulExit(1));

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit();
});
