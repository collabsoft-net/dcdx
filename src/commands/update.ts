#!/usr/bin/env node

import { Command as Commander } from 'commander';
import { gracefulExit } from 'exit-hook';

import { ActionHandler } from '../helpers/ActionHandler';
import { generateVersionList } from '../helpers/generateVersionList';
import { SupportedApplications, TSupportedApplications } from '../types/Application';
import { SupportedDatabaseEngines, TSupportedDatabaseEngines } from '../types/Database';

const program = new Commander();

const Command = (repository?: TSupportedApplications|TSupportedDatabaseEngines) => ({
  action: async () => {
    await generateVersionList(repository);
  },
  errorHandler: async () => {
    console.log(`Failed to update product version information`);
  }
})

program
  .name('dcdx update')
  .description(`Update DCDX product version list`)
  .allowUnknownOption(false)
  .showHelpAfterError(true)

program
  .command('all', { isDefault: true, hidden: true })
  .action(options => ActionHandler(program, Command(), options));

Object.values(SupportedApplications.Values).forEach(item => {
  program
    .command(item)
    .description(`Update the DCDX product version list for ${item}`)
    .action(options => ActionHandler(program, Command(item), options));
});

Object.values(SupportedDatabaseEngines.Values).forEach(item => {
  program
    .command(item)
    .description(`Update the DCDX product version list for ${item}`)
    .action(options => ActionHandler(program, Command(item), options));
});

program.parseAsync(process.argv).catch(() => gracefulExit(1));

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit(1);
});


