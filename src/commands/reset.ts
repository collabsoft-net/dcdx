#!/usr/bin/env node

import { Option, program } from 'commander';

import { AMPS } from '../applications/amps';
import { SupportedApplications } from '../types/SupportedApplications';

// Check if there is a command in the arguments
const isDefaultCommand = !process.argv.some(item => Object.values(SupportedApplications).includes(item as SupportedApplications));
// If there is no command, check if we are running this within the context of an Atlassian Plugin project
if (isDefaultCommand) {
  const application = AMPS.getApplication();
  if (application) {
    const args = [ application, ...process.argv.splice(2) ];
    process.argv = [ ...process.argv.slice(0, 2), ...args ];
  }
}

program
  .name('dcdx reset')
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
  .command('bamboo', 'Remove all data (incl. database) for Atlassian Bamboo (standalone)', { executableFile: './reset-bamboo.js'})
  .command('bitbucket', 'Remove all data (incl. database) for Atlassian Bitbucket (standalone)', { executableFile: './reset-bitbucket.js'})
  .command('confluence', 'Remove all data (incl. database) for Atlassian Confluence (standalone)', { executableFile: './reset-confluence.js'})
  .command('jira', 'Remove all data (incl. database) for Atlassian Jira (standalone)', { executableFile: './reset-jira.js'})
  .showHelpAfterError(true);

program.parse(process.argv);