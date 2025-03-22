#!/usr/bin/env node

import { Command as Commander, Option } from 'commander';
import { gracefulExit } from 'exit-hook';

import { ActionHandler } from '../helpers/ActionHandler';
import { getConfig } from '../helpers/getConfig';
import { setupHost } from '../helpers/setupHost';
import { showHelpWithDefaultCommandOptions } from '../helpers/showHelpWithDefaultCommandOptions';
import { SupportedApplications } from '../types/Application';
import { TConfigureOptions } from '../types/Configure';

const program = new Commander();

const Command = () => {
  return {
    action: async (options: TConfigureOptions) => {
      const config = await getConfig(options.config, options.cwd);
      await setupHost(options.product, config);
    },
    errorHandler: async () => {
    }
  }
};

program
  .name('dcdx configure')
  .description(
`Automated initial setup of the host application
If you wish to run a specific host application, call this command with 'dcdx configure <name>'`)
  .addHelpText('afterAll','​') // there is a non-zero white space because the only reason to have this is to force a line break
  .configureHelp(showHelpWithDefaultCommandOptions)
  .allowUnknownOption(false)
  .allowExcessArguments(false)
  .showHelpAfterError(true);

program
  .command('default', { isDefault: true, hidden: true })
  .addOption(new Option('-p, --product <name>', 'The name of the host application').choices(Object.values(SupportedApplications.Values)))
  .addOption(new Option('-c, --config <path>', 'Path to the configuration file').default('dcdx.config.mjs'))
  .addOption(new Option('-u, --url <url>', 'The URL of the host application').default('http://localhost'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the configuration'))
  .action(options => ActionHandler(program, Command(), options));

program
  .command(SupportedApplications.Values.jira)
  .description('Automated initial setup of Atlassian Jira')
  .addOption(new Option('-c, --config <path>', 'Path to the configuration file').default('dcdx.config.mjs'))
  .addOption(new Option('-u, --url <url>', 'The URL of the host application').default('http://localhost'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the configuration'))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedApplications.Values.jira }));

program
  .command(SupportedApplications.Values.confluence)
  .description('Automated initial setup of Atlassian Confluence')
  .addOption(new Option('-c, --config <path>', 'Path to the configuration file').default('dcdx.config.mjs'))
  .addOption(new Option('-u, --url <url>', 'The URL of the host application').default('http://localhost'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the configuration'))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedApplications.Values.confluence }));

program
  .command(SupportedApplications.Values.bamboo)
  .description('Automated initial setup of Atlassian Bamboo')
  .addOption(new Option('-c, --config <path>', 'Path to the configuration file').default('dcdx.config.mjs'))
  .addOption(new Option('-u, --url <url>', 'The URL of the host application').default('http://localhost'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the configuration'))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedApplications.Values.bamboo }));

program
  .command(SupportedApplications.Values.bitbucket)
  .description('Automated initial setup of Atlassian Bitbucket')
  .addOption(new Option('-c, --config <path>', 'Path to the configuration file').default('dcdx.config.mjs'))
  .addOption(new Option('-u, --url <url>', 'The URL of the host application').default('http://localhost'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the configuration'))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedApplications.Values.bitbucket }));

program.parseAsync().catch(() => gracefulExit(1));

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit();
});
