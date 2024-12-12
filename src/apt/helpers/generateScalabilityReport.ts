import { readFileSync, writeFileSync } from 'fs'
import { move } from 'fs-extra';
import { join } from 'path'
import { parse, stringify } from 'yaml';

import { TAPTScalabilityReportOptions } from '../../types/DCAPT';
import { emptyLine, ScalabilityReportMessages } from '../messages';
import { scalabilityReport } from './dcapt';
import { getAptDictory } from './getAptDirectory';
import { getReport } from './getReport';
import { getReportDirectory } from './getReportDirectory';
import { waitForUserInput } from './waitForUserInput';


export const generateScalabilityReport = async (options: TAPTScalabilityReportOptions) => {

  // Show the welcome message
  console.log(ScalabilityReportMessages.header);

  // We are going to reconfirm that we are running on the default configuration (and fetch it if required)
  const cwd = await getAptDictory(options.cwd, true, options.force);

  try {
    // Retrieve the scalability report configuration YAML
    const ymlFilePath = join(cwd, 'app', 'reports_generation', 'scale_profile.yml');
    const contents = readFileSync(ymlFilePath, 'utf8');

    // We need to update the configuration, so let's turn it into JSON
    const configuration = parse(contents);

    // Check if we managed to create a valid JSON output
    if (configuration) {

      // Add the scalability test output directories to the report generator configuration
      if (options.product === 'bamboo') {
        configuration.title = 'DCAPT Performance Testing for Bamboo'
        configuration.check_actions_count = false;
        configuration.runs = [{
          runName: 'without app',
          runType: 'baseline',
          relativePath: '/dcapt/scale_results_1'
        },{
          runName: 'with app',
          runType: 'experiment',
          relativePath: '/dcapt/scale_results_2'
        }, {
          runName: 'with app and app-specific actions',
          runType: 'experiment',
          relativePath: '/dcapt/scale_results_3'
        }]
      } else {
        configuration.runs = [{
          runName: '1 Node',
          runType: 'baseline',
          relativePath: '/dcapt/scale_results_1'
        },{
          runName: '2 Nodes',
          runType: 'experiment',
          relativePath: '/dcapt/scale_results_2'
        }, {
          runName: '4 Nodes',
          runType: 'experiment',
          relativePath: '/dcapt/scale_results_3'
        }]
      }

      // Turn the configuration back into YAML
      const output = stringify(configuration);

      // Replace the docker placeholders with the actual directories provided by the user
      // This will give the user a better understanding of what will happen
      const humanReadableOutput = output
        .replace('/dcapt/scale_results_1', options.resultsDir1)
        .replace('/dcapt/scale_results_2', options.resultsDir2)
        .replace('/dcapt/scale_results_3', options.resultsDir3);

      // Tell the user that we are going to overwrite the existing configuration
      console.log(`
  The scale_profile.yml file will be updated with the following configuration:

${humanReadableOutput}

  The configuration will be written to disk and overwrite existing configuration:
  ${ymlFilePath}
`);

      // Give the user a moment to process this information
      await waitForUserInput('Press a key to continue...', options.force);
      emptyLine();

      // Write the adjusted scalability report generator configuration to disk
      writeFileSync(ymlFilePath, output, { encoding: 'utf8'});
    }
  } catch (err) {
    // Oh no, something went wrong. Abort abort abort!
    throw new Error('Failed to retrieve the scalability report generation configuration');
  }

  // Get the results directory (and make sure it is empty)
  const reportBaseDir = await getReportDirectory(cwd, options.force);

  // Generate the actual report
  await scalabilityReport(cwd, options.resultsDir1, options.resultsDir2, options.resultsDir3);

  // Get the report directory
  const reportDir = getReport(reportBaseDir, 'scalability');

  // We have a successful test, so we should store the results in a 'private' subdirectory of APT
  await move(reportDir, join(options.outputDir, 'scale_profile'), { overwrite: true });

}