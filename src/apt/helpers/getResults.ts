import { existsSync, lstatSync, readdirSync } from 'fs';
import { join } from 'path';

import { readLinesInFile } from '../../helpers/readLinesInFile';
import { TTestResults } from '../../types/DCAPT';

export const getResults = (baseDir: string): Record<TTestResults, string|undefined> => {
  // Placeholder for the test result directory
  let resultsDir = existsSync(join(baseDir, 'results_summary.log')) ? baseDir : null;

  if (!resultsDir) {
    // Let's go find our test result directory
    readdirSync(baseDir).forEach(item => {
      // If we've already found are directory, no need to continue looking
      if (resultsDir) {
        return;
      }

      // Get the statistics for this entry
      const stat = lstatSync(join(baseDir, item));

      // Make sure that this is a test result directory
      if (stat.isDirectory() && existsSync(join(baseDir, item, 'results_summary.log'))) {

        // We've found it!
        resultsDir = join(baseDir, item);

      }
    });
  }

  // Make sure that we have found a test directory, and if not we should throw a hissy fit
  if (resultsDir == null) {
    throw new Error(`Could not find the test results in the provided directory (${baseDir})`);
  }

  // Placeholder for the test results
  const results: Record<TTestResults, string|undefined> = {
    'path': resultsDir,
    'Summary run status': undefined,
    'Application nodes count': undefined,
    'Finished': undefined,
    'Compliant': undefined,
    'Success': undefined,
    'Has app-specific actions': undefined
  };

  // Loop over the result summary and get those damn test results
  readLinesInFile(join(resultsDir, 'results_summary.log'), (line) => {
    Object.keys(results).forEach(header => {
      if (line.startsWith(header)) {
        const result = line.substring(header.length).trim();
        results[header as TTestResults] = result;
      }
    });
  });

  return results;
}