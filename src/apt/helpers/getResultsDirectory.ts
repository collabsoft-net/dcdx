import { confirm } from '@inquirer/prompts';
import { chownSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { userInfo } from 'os';
import { join } from 'path';

import { TSupportedApplications } from '../../types/Application';

export const getResultsDirectory = async (cwd: string, product: TSupportedApplications, force?: boolean) => {

  // Get the path to the results directory
  const path = join(cwd, 'app', 'results', product);

  // Check if the directory already exists
  if (existsSync(path)) {

    // Check if the directory is empty
    const isEmpty = readdirSync(path).length <= 0;
    if (!isEmpty) {

      // If we are in non-interactive mode, make sure to ask nicely if we can remove the results
      if (!force) {

        // Tell the user there are still previous results in the directory
        console.log(`
  There are still results from previous test runs in the current directory:
  ${path}
`);

        // Ask for confirmation that they will be removed
        const canRemove = await confirm({
          message: 'Is it OK if we remove all previous results?',
          default: true
        });

        // If we are not allowed to remove them, throw a hissy fit
        if (!canRemove) {
          throw new Error('The test can only be executed if all previous results have been removed');
        }
      }

      // Make sure the current user owns the directory
      const { gid, uid } = userInfo();
      chownSync(path, uid, gid);

      // Remove the previous results
      rmSync(path, { recursive: true });
    }
  }

  // Make sure that the directory exists
  mkdirSync(path, { recursive: true });

  // Return the path to the results directory
  return path;
}