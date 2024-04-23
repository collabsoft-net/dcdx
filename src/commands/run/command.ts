#!/usr/bin/env node

import { Option, program } from 'commander';
import { asyncExitHook } from 'exit-hook';

import versions from '../../../assets/versions.json';
import { getApplicationByName } from '../../helpers/getApplication';
import { SupportedApplications } from '../../types/SupportedApplications';

export const RunCommand = async (name: SupportedApplications) => {
  const options = program
    .showHelpAfterError(true)
    .addOption(new Option('-v, --version <version>', 'The version of the host application').choices(versions[name]).default('latest'))
    .addOption(new Option('-d, --database <name>', 'The database engine on which the host application will run').choices([ 'postgresql', 'mysql', 'mssql' ]).default('postgresql'))
    .addOption(new Option('-p, --port <port>', 'The HTTP port on which the host application will be accessible').default('80'))
    .addOption(new Option('-c, --contextPath <contextPath>', 'The context path on which the host application will be accessible'))
    .addOption(new Option('-qr, --quickReload <path_to_watch>', 'Add support for QuickReload and add the provided path to the watch list'))
    .addOption(new Option('--clean', 'Remove data files before starting the database').default(false))
    .addOption(new Option('--prune', 'Remove data files when stopping the database').default(false))
    .addOption(new Option('--debug', 'Add support for JVM debugger on port 5005'))
    .parse(process.argv)
    .opts();

  const Application = getApplicationByName(name);
  const instance = new Application({
    version: options.version,
    database: options.database,
    port: Number(options.port),
    contextPath: options.contextPath,
    quickReload: options.qr,
    clean: options.clean,
    prune: options.prune,
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
};