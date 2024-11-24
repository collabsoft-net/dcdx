import { confirm } from '@inquirer/prompts';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';

export const getReportDirectory = async (cwd: string, force?: boolean) => {

  // Get the path to the reports directory
  const path = join(cwd, 'app', 'results', 'reports');

  // Check if the directory already exists
  if (existsSync(path)) {

    // Check if the directory is empty
    const isEmpty = readdirSync(path).length <= 0;
    if (!isEmpty) {

      // If we are in non-interactive mode, make sure to ask nicely if we can remove the reports
      if (!force) {

        // Tell the user there are still previous reports in the directory
        console.log(`
  There are still reports from previous test runs in the current directory:
  ${path}
`);

        // Ask for confirmation that they will be removed
        const canRemove = await confirm({
          message: 'Is it OK if we remove all previous reports?',
          default: true
        });

        // If we are not allowed to remove them, throw a hissy fit
        if (!canRemove) {
          throw new Error('The report can only be generated if all previous reports have been removed');
        }
      }

      // Remove the previous reports
      rmSync(path, { recursive: true });
    }
  }

  // Make sure that the directory exists
  mkdirSync(path, { recursive: true });

  // Return the path to the reports directory
  return path;
}