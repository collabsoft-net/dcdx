#!/usr/bin/env node

import { Option, program } from 'commander';

import { AMPS } from '../helpers/amps';
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
  .name('dcdx stop')
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
  .command('bamboo', 'Stop Atlassian Bamboo (standalone)', { executableFile: './stop/bamboo.js'})
  .command('bitbucket', 'Stop Atlassian Bitbucket (standalone)', { executableFile: './stop/bitbucket.js'})
  .command('confluence', 'Stop Atlassian Confluence (standalone)', { executableFile: './stop/confluence.js'})
  .command('jira', 'Stop Atlassian Jira (standalone)', { executableFile: './stop/jira.js'})
  .showHelpAfterError(true);

program.parse(process.argv);