import { readFileSync, writeFileSync } from 'fs'
import { move } from 'fs-extra';
import { join } from 'path'
import { parse, stringify } from 'yaml';

import { TAPTPerformanceReportOptions } from '../../types/DCAPT';
import { emptyLine, PerformanceReportMessages } from '../messages';
import { regressionReport } from './dcapt';
import { getAptDictory } from './getAptDirectory';
import { getReport } from './getReport';
import { getReportDirectory } from './getReportDirectory';
import { waitForUserInput } from './waitForUserInput';


export const generatePerformanceReport = async (options: TAPTPerformanceReportOptions) => {

  // Show the welcome message
  console.log(PerformanceReportMessages.header);

  // We are going to reconfirm that we are running on the default configuration (and fetch it if required)
  const cwd = await getAptDictory(options.cwd, true, options.force);

  try {
    // Retrieve the performance profile report configuration YAML
    const ymlFilePath = join(cwd, 'app', 'reports_generation', 'performance_profile.yml');
    const contents = readFileSync(ymlFilePath, 'utf8');

    // We need to update the configuration, so let's turn it into JSON
    const configuration = parse(contents);

    // Check if we managed to create a valid JSON output
    if (configuration) {

      // Add the performance baseline and regression test output directories
      // to the performance report generator configuration
      configuration.runs = [{
        runName: 'without app',
        runType: 'baseline',
        relativePath: '/results/run1'
      }, {
        runName: 'with app',
        runType: 'experiment',
        relativePath: '/results/run2'
      }];

      // Turn the configuration back into YAML
      const output = stringify(configuration);

      // Replace the docker placeholders with the actual directories provided by the user
      // This will give the user a better understanding of what will happen
      const humanReadableOutput = output
        .replace('/results/run1', options.resultsDir1)
        .replace('/results/run2', options.resultsDir2);

      // Tell the user that we are going to overwrite the existing configuration
      console.log(`
  The performance_profile.yml file will be updated with the following configuration:

${humanReadableOutput}

  The configuration will be written to disk and overwrite existing configuration:
  ${ymlFilePath}
`);

      // Give the user a moment to process this information
      await waitForUserInput('Press a key to continue...', options.force);
      emptyLine();

      // Write the adjusted performance report generator configuration to disk
      writeFileSync(ymlFilePath, output, { encoding: 'utf8'});
    }
  } catch (err) {
    // Oh no, something went wrong. Abort abort abort!
    throw new Error('Failed to retrieve the performance testing report generation configuration');
  }

  // Get the results directory (and make sure it is empty)
  const reportBaseDir = await getReportDirectory(cwd, options.force);

  // Generate the actual report
  await regressionReport(cwd, options.resultsDir1, options.resultsDir2);

  // Get the report directory
  const reportDir = getReport(reportBaseDir, 'performance');

  // We have a successful test, so we should store the results in a 'private' subdirectory of APT
  await move(reportDir, join(options.outputDir, 'performance_profile'), { overwrite: true });

}