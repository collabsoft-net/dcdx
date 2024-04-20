#!/usr/bin/env node

import { program } from 'commander';

program
  .name('dcdx database')
  .command('postgresql', 'Start PostgreSQL', { executableFile: './database/postgres.js'})
  .command('mysql', 'Start MySQL', { executableFile: './database/mysql.js'})
  .command('mssql', 'Start Microsoft SQL Server', { executableFile: './database/mssql.js'})
  .showHelpAfterError(true);

program.parse();

