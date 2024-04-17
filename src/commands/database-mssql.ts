#!/usr/bin/env node

import { Option, program } from 'commander';
import { asyncExitHook, gracefulExit } from 'exit-hook';

import { MSSQL, MSSQLOptions } from '../databases/mssql';

(async () => {
  const options = program
    .showHelpAfterError(true)
    .addOption(new Option('-v, --version <version>', 'The version of Microsoft SQL Server').choices([ '2017', '2019', '2022' ]).default('2022'))
    .addOption(new Option('-e, --edition <edition>', 'The edition of Microsoft SQL Server').choices([ 'Developer', 'Express', 'Standard', 'Enterprise', 'EnterpriseCore' ]).default('Developer'))
    .addOption(new Option('-p, --port <port>', 'The port on which the database will be accessible').default('1433'))
    .addOption(new Option('-P, --password <password>', 'The value passed to MSSQL_SA_PASSWORD environment variable. MS SQL Server password policy applies.').default('DataCenterDX!'))
    .parse(process.argv)
    .opts();

  const instance = new MSSQL({
    version: options.version,
    edition: options.edition,
    port: Number(options.port),
    password: options.password,
    logging: true
  } as MSSQLOptions);

  asyncExitHook(async () => {
    console.log(`Stopping ${instance.name}... ⏳`);
    await instance.stop();
    console.log(`Stopped ${instance.name} 💪`);
  }, {
    wait: 30 * 1000
  });

  await instance.start();
})();

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit();
});

// Keep the application running until it is terminated by SIGINT
setInterval(() => {}, 1 << 30);


