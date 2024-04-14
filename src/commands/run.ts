#!/usr/bin/env node

import { program } from 'commander';

program
  .name('dcdx run')
  .command('bamboo', 'Start Atlassian Bamboo (standalone)', { executableFile: './run-bamboo.js'})
  .command('bitbucket', 'Start Atlassian Bitbucket (standalone)', { executableFile: './run-bitbucket.js'})
  .command('confluence', 'Start Atlassian Confluence (standalone)', { executableFile: './run-confluence.js'})
  .command('jira', 'Start Atlassian Jira (standalone)', { executableFile: './run-jira.js'})

program.parse();

