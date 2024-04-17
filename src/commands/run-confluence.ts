#!/usr/bin/env node

import { Option, program } from 'commander';
import { asyncExitHook, gracefulExit } from 'exit-hook';

import { Confluence } from '../applications/confluence';

(async () => {
  const options = program
    .showHelpAfterError(true)
    .addOption(new Option('-v, --version <version>', 'The version of the host application').choices([ '8.9.0' ]).default('8.9.0'))
    .addOption(new Option('-d, --database <name>', 'The database engine on which the host application will run').choices([ 'postgresql', 'mysql', 'mssql' ]).default('postgresql'))
    .addOption(new Option('-p, --port <port>', 'The HTTP port on which the host application will be accessible').default('80'))
    .addOption(new Option('-c, --contextPath <contextPath>', 'The context path on which the host application will be accessible'))
    .addOption(new Option('-qr, --quickReload <path_to_watch>', 'Add support for QuickReload and add the provided path to the watch list'))
    .addOption(new Option('--debug', 'Add support for JVM debugger on port 5005'))
    .parse(process.argv)
    .opts();

  const instance = new Confluence({
    version: options.version,
    database: options.database,
    port: Number(options.port),
    contextPath: options.contextPath,
    quickReload: options.qr,
    debug: options.debug
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