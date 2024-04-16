#!/usr/bin/env node

import { Option, program } from 'commander';
import { asyncExitHook, gracefulExit } from 'exit-hook';

import { MySQL } from '../databases/mysql';

(async () => {
  const options = program
    .showHelpAfterError(true)
    .addOption(new Option('-v, --version <version>', 'The version of Postgres').choices([ '8.0', '8.3' ]).default('8.3'))
    .addOption(new Option('-d, --database <database>', 'The value passed to MYSQL_DATABASE environment variable').default('dcdx'))
    .addOption(new Option('-p, --port <port>', 'The port on which the database will be accessible').default('3306'))
    .addOption(new Option('-U, --username <username>', 'The value passed to MYSQL_USER environment variable').default('dcdx'))
    .addOption(new Option('-P, --password <password>', 'The value passed to MYSQL_PASSWORD environment variable').default('dcdx'))
    .parse(process.argv)
    .opts();

  const instance = new MySQL({
    version: options.version,
    database: options.database,
    port: Number(options.port),
    username: options.username,
    password: options.password,
    logging: true
  });

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


