#!/usr/bin/env node

import { gracefulExit } from 'exit-hook';

import { SupportedApplications } from '../../types/SupportedApplications';
import { StopCommand } from './command';

StopCommand(SupportedApplications.BAMBOO);

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit();
});