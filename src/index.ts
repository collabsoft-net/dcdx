#!/usr/bin/env node

import { program } from 'commander';

import { version } from '../package.json';

program
  .name('dcdx')
  .description('The Unofficial Atlassian Data Center Plugin Development CLI')
  .version(version)
  .showHelpAfterError(true);

// ------------------------------------------------------------------------------------------ Build

program
  .command('build', 'Build & install the Atlassian Data Center plugin from the current directory', { executableFile: './commands/build.js' });

// ------------------------------------------------------------------------------------------ Start

program
  .command('start', 'Build & install the Atlassian Data Center plugin from the current directory', { executableFile: './commands/start.js' });

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

program.parse(process.argv);


