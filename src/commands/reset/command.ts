#!/usr/bin/env node

import { Option, program } from 'commander';

import versions from '../../../assets/versions.json';
import { AMPS } from '../../helpers/amps';
import { getApplicationByName } from '../../helpers/getApplication';
import { SupportedApplications } from '../../types/SupportedApplications';

const version = AMPS.getApplicationVersion() || 'latest';

export const ResetCommand = async (name: SupportedApplications) => {
  const options = program
    .showHelpAfterError(true)
    .addOption(new Option('-d, --database <name>', 'The database engine to remove data from').choices([ 'postgresql', 'mysql', 'mssql' ]).default('postgresql'))
    .addOption(new Option('-v, --version <version>', 'The version of the host application').choices(versions[name]).default(version))
    .parse(process.argv)
    .opts();

  const Application = getApplicationByName(name);
  const instance = new Application({
    version: options.version,
    database: options.database
  });

  await instance.reset();
};