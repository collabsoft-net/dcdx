#!/usr/bin/env node

import { program } from 'commander';

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
  .name('dcdx run')
  .command('bamboo', 'Start Atlassian Bamboo (standalone)', { executableFile: './run-bamboo.js'})
  .command('bitbucket', 'Start Atlassian Bitbucket (standalone)', { executableFile: './run-bitbucket.js'})
  .command('confluence', 'Start Atlassian Confluence (standalone)', { executableFile: './run-confluence.js'})
  .command('jira', 'Start Atlassian Jira (standalone)', { executableFile: './run-jira.js'});

program.parse(process.argv);