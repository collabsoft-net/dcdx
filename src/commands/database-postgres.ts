#!/usr/bin/env node

import { Option, program } from 'commander';
import { asyncExitHook, gracefulExit } from 'exit-hook';

import { postgres as versions } from '../../assets/versions.json';
import { Postgres } from '../databases/postgres';

(async () => {
  const options = program
    .showHelpAfterError(true)
    .addOption(new Option('-v, --version <version>', 'The version of Postgres').choices(versions).default('latest'))
    .addOption(new Option('-d, --database <database>', 'The value passed to POSTGRES_DB environment variable').default('dcdx'))
    .addOption(new Option('-p, --port <port>', 'The port on which the database will be accessible').default('5432'))
    .addOption(new Option('-U, --username <username>', 'The value passed to POSTGRES_USER environment variable').default('dcdx'))
    .addOption(new Option('-P, --password <password>', 'The value passed to POSTGRES_PASSWORD environment variable').default('dcdx'))
    .addOption(new Option('--clean', 'Remove data files before starting the database').default(false))
    .addOption(new Option('--prune', 'Remove data files when stopping the database').default(false))
    .parse(process.argv)
    .opts();

  const instance = new Postgres({
    version: options.version,
    database: options.database,
    port: Number(options.port),
    username: options.username,
    password: options.password,
    clean: options.clean,
    prune: options.prune,
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


