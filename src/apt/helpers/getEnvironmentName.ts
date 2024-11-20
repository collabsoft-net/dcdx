import { input } from '@inquirer/prompts';

import { provisioning } from '../messages'

export const getEnvironmentName = async () => {
  console.log(provisioning.askForEnvironment);

  return input({
    message: `Environment name`,
    required: true
  });
}