#!/usr/bin/env node

import { Command as Commander, Option } from 'commander';
import { gracefulExit } from 'exit-hook';

import versions from '../../assets/versions.json';
import { ActionHandler } from '../helpers/ActionHandler';
import { getDatabaseEngine } from '../helpers/getDatabaseEngine';
import { getZodDefault } from '../helpers/getZodDefaults';
import { DatabaseEngine, MSSQLOptions, MySQLOptions, PostgreSQLOptions, SupportedDatabaseEngines, SupportedMSSQLEditions, TDatabaseOptions } from '../types/Database';

const program = new Commander();

const Command = () => {
  let instance: DatabaseEngine|null = null;

  return {
    action: async (options: TDatabaseOptions) => {
      instance = getDatabaseEngine(options);
      return instance.start();
    },
    errorHandler: async () => {
      if (instance) {
        const { name } = instance.options;
        console.log(`Stopping ${name}... ⏳`);
        await instance.stop().then(() => {
          console.log(`Stopped ${name} 💪`);
        }).catch(() => {
          console.log(`Failed to stopped ${name}, manual action is required`);
        });
      }
    }
  }
}

program
  .name('dcdx database')
  .showHelpAfterError(true);

program
  .command('postgresql')
  .description('Start PostgreSQL')
  .addOption(new Option('-t, --tag <tag>', 'The Docker tag of Postgres').choices(versions[SupportedDatabaseEngines.Values.postgresql]).default('latest'))
  .addOption(new Option('-d, --database <database>', 'The value passed to POSTGRES_DB environment variable').default(getZodDefault(PostgreSQLOptions, 'database')))
  .addOption(new Option('-p, --port <port>', 'The port on which the database will be accessible').default(getZodDefault(PostgreSQLOptions, 'port')))
  .addOption(new Option('-U, --username <username>', 'The value passed to POSTGRES_USER environment variable').default(getZodDefault(PostgreSQLOptions, 'username')))
  .addOption(new Option('-P, --password <password>', 'The value passed to POSTGRES_PASSWORD environment variable').default(getZodDefault(PostgreSQLOptions, 'password')))
  .addOption(new Option('--clean', 'Remove data files before starting the database').default(false))
  .addOption(new Option('--prune', 'Remove data files when stopping the database').default(false))
  .addOption(new Option('--verbose', 'Output database log files').default(false))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedDatabaseEngines.Values.postgresql }));

program
  .command('mysql')
  .description('Start MySQL')
  .addOption(new Option('-t, --tag <tag>', 'The Docker tag of MySQL').choices(versions[SupportedDatabaseEngines.Values.mysql]).default('latest'))
  .addOption(new Option('-d, --database <database>', 'The value passed to MYSQL_DATABASE environment variable').default(getZodDefault(MySQLOptions, 'database')))
  .addOption(new Option('-p, --port <port>', 'The port on which the database will be accessible').default(getZodDefault(MySQLOptions, 'port')))
  .addOption(new Option('-U, --username <username>', 'The value passed to MYSQL_USER environment variable').default(getZodDefault(MySQLOptions, 'username')))
  .addOption(new Option('-P, --password <password>', 'The value passed to MYSQL_PASSWORD environment variable').default(getZodDefault(MySQLOptions, 'password')))
  .addOption(new Option('--clean', 'Remove data files before starting the database').default(false))
  .addOption(new Option('--prune', 'Remove data files when stopping the database').default(false))
  .addOption(new Option('--verbose', 'Output database log files').default(false))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedDatabaseEngines.Values.mysql }));

program
  .command('mssql')
  .description('Start Microsoft SQL Server')
  .addOption(new Option('-t, --tag <tag>', 'The Docker tag of Microsoft SQL Server').choices(versions[SupportedDatabaseEngines.Values.mssql]).default('latest'))
  .addOption(new Option('-e, --edition <edition>', 'The edition of Microsoft SQL Server').choices(Object.values(SupportedMSSQLEditions.Values)).default(SupportedMSSQLEditions.Values.Developer))
  .addOption(new Option('-d, --database <database>', 'The name of the database (automatically created)').default(getZodDefault(MSSQLOptions, 'database')))
  .addOption(new Option('-p, --port <port>', 'The port on which the database will be accessible').default(getZodDefault(MSSQLOptions, 'port')))
  .addOption(new Option('-P, --password <password>', 'The value passed to MSSQL_SA_PASSWORD environment variable. MS SQL Server password policy applies.').default(getZodDefault(MSSQLOptions, 'password')))
  .addOption(new Option('--clean', 'Remove data files before starting the database').default(false))
  .addOption(new Option('--prune', 'Remove data files when stopping the database').default(false))
  .addOption(new Option('--verbose', 'Output database log files').default(false))
  .action(options => ActionHandler(program, Command(), { ...options, name: SupportedDatabaseEngines.Values.mssql, username: 'sa' }));

program.parseAsync(process.argv).catch(() => gracefulExit(1));

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit();
});
