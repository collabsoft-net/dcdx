#!/usr/bin/env node

import { Option, program } from 'commander';
import { asyncExitHook, gracefulExit } from 'exit-hook';

import versions from '../../../assets/versions.json';
import { getApplicationByName } from '../../helpers/getApplication';
import { SupportedApplications } from '../../types/SupportedApplications';

export const StopCommand = async (name: SupportedApplications) => {
  const options = program
    .showHelpAfterError(true)
    .addOption(new Option('-v, --version <version>', 'The version of the host application').choices(versions[name]).default('latest'))
    .addOption(new Option('-d, --database <name>', 'The database engine on which the host application will run').choices([ 'postgresql', 'mysql', 'mssql' ]).default('postgresql'))
    .addOption(new Option('--prune', 'Remove data files when stopping the database').default(false))
    .parse(process.argv)
    .opts();

  const Application = getApplicationByName(name);
  const instance = new Application({
    version: options.version,
    database: options.database,
    prune: options.prune
  });

  asyncExitHook(async () => {
    console.log(`Stopping ${instance.name}... ⏳`);
    await instance.stop();
    console.log(`Stopped ${instance.name} 💪`);
  }, {
    wait: 30 * 1000
  });

  gracefulExit();
};