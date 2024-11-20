import { format } from 'date-fns';
import { homedir } from 'os';
import { join } from 'path';

export const getOutputDirectory = (timestamp?: string) => {
  // Create the test run ID (used in the output directory)
  const runId = timestamp || format(new Date(), 'yyyy-MM-dd-HH-mm');

  // Return the output directory for the test results
  return join(homedir(), '.dcdx', 'apt', runId);
}
