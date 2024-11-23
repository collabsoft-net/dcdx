import { format } from 'date-fns';
import { homedir } from 'os';
import { join } from 'path';

export const getOutputDirectory = (cwd?: string, timestamp?: string) => {
  // Create the test run ID (used in the output directory)
  const runId = timestamp || format(new Date(), 'yyyy-MM-dd-HH-mm');

  // Either use the provided output directory, or default to the home directory
  const baseDir = cwd || join(homedir(), '.dcdx', 'apt');

  // Return the output directory for the test results
  return join(baseDir, runId);
}
