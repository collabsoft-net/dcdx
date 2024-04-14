#!/usr/bin/env node

import { Option, program } from 'commander';
import { asyncExitHook, gracefulExit } from 'exit-hook';

import { Postgres } from '../databases/postgres';

(async () => {
  const options = program
    .addOption(new Option('-v, --version <version>', 'The version of Postgres').choices([ '12', '13', '14', '15']).default('15'))
    .addOption(new Option('-d, --database <database>', 'The value passed to POSTGRES_DB environment variable').default('dcdx'))
    .addOption(new Option('-p, --port <port>', 'The port on which the database will be accessible').default('5432'))
    .addOption(new Option('-U, --username <username>', 'The value passed to POSTGRES_USER environment variable').default('dcdx'))
    .addOption(new Option('-P, --password <password>', 'The value passed to POSTGRES_PASSWORD environment variable').default('dcdx'))
    .parse(process.argv)
    .opts();

  const instance = new Postgres({
    version: options.version,
    database: options.database,
    port: Number(options.port),
    username: options.username,
    password: options.password,
    logging: true
  })

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

