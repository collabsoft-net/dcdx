import { input } from '@inquirer/prompts';

export const getDuration = (force?: boolean) => {
  if (force) {
    return '45m';
  }

  return input({
    message: `How long should the test run?`,
    default: '45m',
    required: true
  })
}