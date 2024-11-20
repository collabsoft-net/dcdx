import inquirer from 'inquirer';
import PressToContinuePrompt, { KeyDescriptor } from 'inquirer-press-to-continue';

inquirer.registerPrompt('press-to-continue', PressToContinuePrompt);

export const waitForUserInput = async (message: string, force?: boolean): Promise<KeyDescriptor> => {
  const { key } = await inquirer.prompt<{ key: KeyDescriptor }>({
    name: 'key',
    type: 'press-to-continue',
    anyKey: true,
    pressToContinueMessage: message,
    when: !force
  });
  return key || { value: undefined }
}