#!/usr/bin/env node

import { Command as Commander,InvalidOptionArgumentError,Option } from 'commander';
import { gracefulExit } from 'exit-hook';

import { ActionHandler } from '../helpers/ActionHandler';
import { AMPS } from '../helpers/amps';
import { getApplication } from '../helpers/getApplication';
import { getVersions } from '../helpers/getVersions';
import { showHelpWithDefaultCommandOptions } from '../helpers/showHelpWithDefaultCommandOptions';
import { Application, SupportedApplications, TApplicationOptions } from '../types/Application';
import { SupportedDatabaseEngines } from '../types/Database';

const program = new Commander();
const versions = getVersions();

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

      if (options.databaseTag && !versions[options.database].includes(options.databaseTag)) {
        throw new Error(`Database tag '${options.databaseTag}' is invalid. Allowed choices are ${versions[options.database].join(', ')}.`);
      }

      instance = getApplication(options);
      console.log(`Starting ${instance.name}... 💃`);
      await instance.start();
    },
    errorHandler: async () => {
      if (instance) {
        console.log(`Stopping ${instance.name}... 💔`);
        await instance.stop().catch(() => null);
        console.log(`Stopped ${instance.name} 💪`);
      }
    }
  }
};

program
  .name('dcdx run')
  .description(
`Run the host application based on the Atlassian Maven Plugin Suite (AMPS) configuration.
If you wish to run a specific host application, call this command with 'dcdx run <name>'`)
  .addHelpText('afterAll','​') // there is a non-zero white space because the only reason to have this is to force a line break
  .configureHelp(showHelpWithDefaultCommandOptions)
  .allowUnknownOption(false)
  .allowExcessArguments(false)
  .showHelpAfterError(true);

program
  .command('fromAMPS', { isDefault: true, hidden: true })
  .addOption(new Option('-t, --tag <name>', 'The Docker tag of the host application'))
  .addOption(new Option('-d, --database <name>', 'The database engine on which the host application will run').choices(Object.values(SupportedDatabaseEngines.Values)).default(SupportedDatabaseEngines.Values.postgresql))
  .addOption(new Option('--database-tag <name>', 'The Docker tag of the database engine'))
  .addOption(new Option('-p, --port <port>', 'The HTTP port on which the host application will be accessible').default('80'))
  .addOption(new Option('-c, --contextPath <contextPath>', 'The context path on which the host application will be accessible'))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
  .addOption(new Option('--xms <value>', 'JVM minimum heap size').default('1024m'))
  .addOption(new Option('--xmx <value>', 'JVM maximum heap size').default('1024m'))
  .addOption(new Option('--jvm <args>', 'Additional JVM args'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the AMPS configuration'))
  .addOption(new Option('--configure', 'Automated initial setup of the host application').default(false))
  .addOption(new Option('--clean', 'Remove data files before starting the host application').default(false))
  .addOption(new Option('--prune', 'Remove data files when stopping the host application').default(false))
  .addOption(new Option('--debug', 'Add support for JVM debugger on port 5005').default(false))
  .action(options => ActionHandler(program, Command(), options));

program
  .command(SupportedApplications.Values.jira)
  .description('Start Atlassian Jira (standalone)')
  .addOption(new Option('-t, --tag <name>', 'The Docker tag of Atlassian Jira').choices(versions[SupportedApplications.Values.jira]).default('latest'))
  .addOption(new Option('-d, --database <name>', 'The database engine on which the Atlassian Jira will run').choices(Object.values(SupportedDatabaseEngines.Values)).default(SupportedDatabaseEngines.Values.postgresql))
  .addOption(new Option('--database-tag <name>', 'The Docker tag of the database engine'))
  .addOption(new Option('-p, --port <port>', 'The HTTP port on which Atlassian Jira will be accessible').default('80'))
  .addOption(new Option('-c, --contextPath <contextPath>', 'The context path on which Atlassian Jira will be accessible'))
  .addOption(new Option('--xms <value>', 'JVM minimum heap size').default('1024m'))
  .addOption(new Option('--xmx <value>', 'JVM maximum heap size').default('1024m'))
  .addOption(new Option('--jvm <args>', 'Additional JVM args'))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory'))
  .addOption(new Option('--configure', 'Automated initial setup of the host application').default(false))
  .addOption(new Option('--clean', 'Remove data files before starting Atlassian Jira').default(false))
  .addOption(new Option('--prune', 'Remove data files when stopping Atlassian Jira').default(false))
  .addOption(new Option('--debug', 'Add support for JVM debugger on port 5005').default(false))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedApplications.Values.jira }));

program
  .command(SupportedApplications.Values.confluence)
  .description('Start Atlassian Confluence (standalone)')
  .addOption(new Option('-t, --tag <name>', 'The Docker tag of Atlassian Confluence').choices(versions[SupportedApplications.Values.confluence]).default('latest'))
  .addOption(new Option('-d, --database <name>', 'The database engine on which the Atlassian Confluence will run').choices(Object.values(SupportedDatabaseEngines.Values)).default(SupportedDatabaseEngines.Values.postgresql))
  .addOption(new Option('--database-tag <name>', 'The Docker tag of the database engine'))
  .addOption(new Option('-p, --port <port>', 'The HTTP port on which Atlassian Confluence will be accessible').default('80'))
  .addOption(new Option('-c, --contextPath <contextPath>', 'The context path on which Atlassian Confluence will be accessible'))
  .addOption(new Option('--xms <value>', 'JVM minimum heap size').default('1024m'))
  .addOption(new Option('--xmx <value>', 'JVM maximum heap size').default('1024m'))
  .addOption(new Option('--jvm <args>', 'Additional JVM args'))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory'))
  .addOption(new Option('--configure', 'Automated initial setup of the host application').default(false))
  .addOption(new Option('--clean', 'Remove data files before starting Atlassian Confluence').default(false))
  .addOption(new Option('--prune', 'Remove data files when stopping Atlassian Confluence').default(false))
  .addOption(new Option('--debug', 'Add support for JVM debugger on port 5005').default(false))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedApplications.Values.confluence }));

program
  .command(SupportedApplications.Values.bitbucket)
  .description('Start Atlassian Bitbucket (standalone)')
  .addOption(new Option('-t, --tag <name>', 'The Docker tag of Atlassian Bitbucket').choices(versions[SupportedApplications.Values.bitbucket]).default('latest'))
  .addOption(new Option('-d, --database <name>', 'The database engine on which the Atlassian Bitbucket will run').choices(Object.values(SupportedDatabaseEngines.Values)).default(SupportedDatabaseEngines.Values.postgresql))
  .addOption(new Option('--database-tag <name>', 'The Docker tag of the database engine'))
  .addOption(new Option('-p, --port <port>', 'The HTTP port on which Atlassian Bitbucket will be accessible').default('80'))
  .addOption(new Option('-c, --contextPath <contextPath>', 'The context path on which Atlassian Bitbucket will be accessible'))
  .addOption(new Option('--xms <value>', 'JVM minimum heap size').default('1024m'))
  .addOption(new Option('--xmx <value>', 'JVM maximum heap size').default('1024m'))
  .addOption(new Option('--jvm <args>', 'Additional JVM args'))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory'))
  .addOption(new Option('--configure', 'Automated initial setup of the host application').default(false))
  .addOption(new Option('--clean', 'Remove data files before starting Atlassian Bitbucket').default(false))
  .addOption(new Option('--prune', 'Remove data files when stopping Atlassian Bitbucket').default(false))
  .addOption(new Option('--debug', 'Add support for JVM debugger on port 5005').default(false))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedApplications.Values.bitbucket }));

program
  .command(SupportedApplications.Values.bamboo)
  .description('Start Atlassian Bamboo (standalone)')
  .addOption(new Option('-t, --tag <name>', 'The Docker tag of Atlassian Bamboo').choices(versions[SupportedApplications.Values.bamboo]).default('latest'))
  .addOption(new Option('-d, --database <name>', 'The database engine on which the Atlassian Bamboo will run').choices(Object.values(SupportedDatabaseEngines.Values)).default(SupportedDatabaseEngines.Values.postgresql))
  .addOption(new Option('--database-tag <name>', 'The Docker tag of the database engine'))
  .addOption(new Option('-p, --port <port>', 'The HTTP port on which Atlassian Bamboo will be accessible').default('80'))
  .addOption(new Option('-c, --contextPath <contextPath>', 'The context path on which Atlassian Bamboo will be accessible'))
  .addOption(new Option('--xms <value>', 'JVM minimum heap size').default('1024m'))
  .addOption(new Option('--xmx <value>', 'JVM maximum heap size').default('1024m'))
  .addOption(new Option('--jvm <args>', 'Additional JVM args'))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory'))
  .addOption(new Option('--configure', 'Automated initial setup of the host application').default(false))
  .addOption(new Option('--clean', 'Remove data files before starting Atlassian Bamboo').default(false))
  .addOption(new Option('--prune', 'Remove data files when stopping Atlassian Bamboo').default(false))
  .addOption(new Option('--debug', 'Add support for JVM debugger on port 5005').default(false))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedApplications.Values.bamboo }));

program.parseAsync().catch(() => gracefulExit(1));

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit();
});
