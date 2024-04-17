#!/usr/bin/env node

import { Option, program } from 'commander';
import { gracefulExit } from 'exit-hook';

import { jira as versions } from '../../assets/versions.json';
import { AMPS } from '../applications/amps';
import { Jira } from '../applications/jira';

const version = AMPS.getApplicationVersion() || 'latest';

(async () => {
  const options = program
    .showHelpAfterError(true)
    .addOption(new Option('-v, --version <version>', 'The version of the host application').choices(versions).default(version))
    .addOption(new Option('-d, --database <name>', 'The database engine to remove data from').choices([ 'postgresql', 'mysql', 'mssql' ]).default('postgresql'))
    .parse(process.argv)
    .opts();

  const instance = new Jira({
    version: options.version,
    database: options.database,
  });

  await instance.reset();
})();

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit();
});