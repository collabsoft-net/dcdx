import { cpSync, readFileSync, writeFileSync } from 'fs'
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
      configuration.runs = [{
        runName: '1 Node',
        runType: 'baseline',
        relativePath: '/results/run3'
      },{
        runName: '2 Nodes',
        runType: 'experiment',
        relativePath: '/results/run4'
      }, {
        runName: '4 Nodes',
        runType: 'experiment',
        relativePath: '/results/run5'
      }]

      // Turn the configuration back into YAML
      const output = stringify(configuration);

      // Tell the user that we are going to overwrite the existing configuration
      console.log(`
  The scale_profile.yml file will be updated with the following configuration:

${output}

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
  await scalabilityReport(cwd, join(options.outputDir, 'run3'), join(options.outputDir, 'run4'), join(options.outputDir, 'run5'));

  // Get the report directory
  const reportDir = getReport(reportBaseDir, 'scalability');

  // We have a successful test, so we should store the results in a 'private' subdirectory of APT
  cpSync(reportDir, join(options.outputDir, 'scale_profile'));

}