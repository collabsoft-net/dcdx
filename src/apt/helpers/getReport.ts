import { existsSync, lstatSync, readdirSync } from 'fs';
import { join } from 'path';

import { TReportTypes } from '../../types/DCAPT';

export const getReport = (baseDir: string, type: TReportTypes): string => {

  // Get the file name of the report summary to check if the provided baseDir already contains the report
  const summaryFileName = type === 'performance' ? 'performance_profile_summary.log' : 'scale_profile_summary.log';

  // Placeholder for the report directory
  let resultsDir = existsSync(join(baseDir, summaryFileName)) ? baseDir : null;

  if (!resultsDir) {
    // Let's go find our report directory
    readdirSync(baseDir).forEach(item => {
      // If we've already found are directory, no need to continue looking
      if (resultsDir) {
        return;
      }

      // Get the statistics for this entry
      const stat = lstatSync(join(baseDir, item));

      // Make sure that this is a report directory
      if (stat.isDirectory() && existsSync(join(baseDir, item, summaryFileName))) {

        // We've found it!
        resultsDir = join(baseDir, item);

      }
    });
  }

  // Make sure that we have found a report directory, and if not we should throw a hissy fit
  if (resultsDir == null) {
    throw new Error(`Could not find the reports in the provided directory (${baseDir})`);
  }

  return resultsDir;
}