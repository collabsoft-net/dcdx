#!/usr/bin/env node

import { program } from 'commander';
import { existsSync } from 'fs';

import { version } from '../package.json';
import { toAbsolutePath } from './helpers/toAbsolutePath';

program
  .name('dcdx')
  .description('The Unofficial Atlassian Data Center Plugin Development CLI')
  .version(version)
  .showHelpAfterError(true);

// ------------------------------------------------------------------------------------------ APT

program
  .command('apt', 'Run the App Performance Toolkit tests', { executableFile: './commands/apt.js' });

// ------------------------------------------------------------------------------------------ Build

program
  .command('build', 'Build the Atlassian Data Center plugin based on the Atlassian Maven Plugin Suite (AMPS) configuration', { executableFile: './commands/build.js' });

// ------------------------------------------------------------------------------------------ Install

program
  .command('install', 'Install the Atlassian Data Center plugin based on the Atlassian Maven Plugin Suite (AMPS) configuration', { executableFile: './commands/install.js' });


// ------------------------------------------------------------------------------------------ Start

program
  .command('debug', 'Start the product in debug mode based on the Atlassian Maven Plugin Suite (AMPS) configuration with the plugin installed', { executableFile: './commands/debug.js' });

// ------------------------------------------------------------------------------------------ Run

program
  .command('run', 'Start the Atlassian host application (standalone)', { executableFile: './commands/run.js' });

program
  .command('run:jira')
  .description('Start Atlassian Jira')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'run', 'jira' ]);
    program.parse(process.argv);
  });

program
  .command('run:confluence')
  .description('Start Atlassian Confluence')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'run', 'confluence' ]);
    program.parse(process.argv);
  });

program
  .command('run:bitbucket')
  .description('Start Atlassian Bitbucket')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'run', 'bitbucket' ]);
    program.parse(process.argv);
  });

program
  .command('run:bamboo')
  .description('Start Atlassian Bamboo')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'run', 'bamboo' ]);
    program.parse(process.argv);
  });

// ------------------------------------------------------------------------------------------ Configure

program
  .command('configure', 'Automated initial setup of the Atlassian host application', { executableFile: './commands/configure.js' });

program
  .command('configure:jira')
  .description('Automated initial setup of Atlassian Jira')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'configure', 'jira' ]);
    program.parse(process.argv);
  });

program
  .command('configure:confluence')
  .description('Automated initial setup of Atlassian Confluence')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'configure', 'confluence' ]);
    program.parse(process.argv);
  });

program
  .command('configure:bitbucket')
  .description('Automated initial setup of Atlassian Bitbucket')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'configure', 'bitbucket' ]);
    program.parse(process.argv);
  });

program
  .command('configure:bamboo')
  .description('Automated initial setup of Atlassian Bamboo')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'configure', 'bamboo' ]);
    program.parse(process.argv);
  });

// ------------------------------------------------------------------------------------------ Database

program
  .command('database', 'Start a database engine (standalone)', { executableFile: './commands/database.js'})

program
  .command('database:postgres')
  .description('Start PostgreSQL')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'database', 'postgresql' ]);
    program.parse(process.argv);
  });

program
  .command('database:postgresql')
  .description('Start PostgreSQL')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'database', 'postgresql' ]);
    program.parse(process.argv);
  });

program
  .command('database:mysql')
  .description('Start MySQL')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'database', 'mysql' ]);
    program.parse(process.argv);
  });

program
  .command('database:mssql')
  .description('Start Microsoft Sql Server')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'database', 'mssql' ]);
    program.parse(process.argv);
  });

// ------------------------------------------------------------------------------------------ Stop

program
  .command('stop', 'Stop the host application and database', { executableFile: './commands/stop.js' });

// ------------------------------------------------------------------------------------------ Reset

program
  .command('reset', 'Remove all application data (incl. database) and start fresh!', { executableFile: './commands/reset.js' });

// ------------------------------------------------------------------------------------------ Profile

program
  .command('profile', 'Run a predefined profile', { executableFile: './commands/profile.js' })
  .on('command:*', (args) => {
    const command = args[0];
    process.argv.splice(2, 1, ...[ 'profile', command ]);
    program.parse(process.argv);
  });

// ------------------------------------------------------------------------------------------ Update

program
  .command('update', 'Update the DCDX host product version list', { executableFile: './commands/update.js' });

program
  .command('update:jira')
  .description('Update the DCDX product version list for Atlassian Jira')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'update', 'jira' ]);
    program.parse(process.argv);
  });

program
  .command('update:confluence')
  .description('Update the DCDX product version list for Atlassian Confluence')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'update', 'confluence' ]);
    program.parse(process.argv);
  });

program
  .command('update:bamboo')
  .description('Update the DCDX product version list for Atlassian Bamboo')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'update', 'bamboo' ]);
    program.parse(process.argv);
  });

program
  .command('update:bitbucket')
  .description('Update the DCDX product version list for Atlassian Bitbucket')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'update', 'bitbucket' ]);
    program.parse(process.argv);
  });

program
  .command('update:mysql')
  .description('Update the DCDX product version list for MySQL')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'update', 'mysql' ]);
    program.parse(process.argv);
  });

program
  .command('update:postgresql')
  .description('Update the DCDX product version list for Postgres SQL')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'update', 'postgresql' ]);
    program.parse(process.argv);
  });

program
  .command('update:mssql')
  .description('Update the DCDX product version list for Microsoft SQL Server')
  .action(() => {
    process.argv.splice(2, 1, ...[ 'update', 'mssql' ]);
    program.parse(process.argv);
  });


// Check if we need to update our version list before we parse the arguments
if (!process.argv.includes('update') && !existsSync(toAbsolutePath('../assets/versions.json'))) {
  program.error('Unable to find host product version list, please run `dcdx update`');
}

program.parse();


