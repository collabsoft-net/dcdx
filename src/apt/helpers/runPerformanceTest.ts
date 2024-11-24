import { confirm } from '@inquirer/prompts';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { move } from 'fs-extra';
import { join } from 'path';

import { TAPTPerformanceTestMessages, TAPTPerformanceTestOptions, TPerformanceTestTypes } from '../../types/DCAPT';
import { runTest } from '../helpers/dcapt';
import { getAptDictory } from '../helpers/getAptDirectory';
import { getClusterURL } from '../helpers/getClusterURL';
import { getDuration } from '../helpers/getDuration';
import { getResults } from '../helpers/getResults';
import { getResultsDirectory } from '../helpers/getResultsDirectory';
import { installApp } from '../helpers/installApp';
import { persistTestConfiguration } from '../helpers/persistTestConfiguration';
import { reindex } from '../helpers/reindex';
import { waitForUserInput } from '../helpers/waitForUserInput';
import { getAWSCredentials } from './getAWSCredentials';
import { getRunForStage } from './getRunForStage';
import { persistAWSCredentials } from './persistsAWSCredentials';

export const runPerformanceTest = async (stage: TPerformanceTestTypes, options: TAPTPerformanceTestOptions, messages: TAPTPerformanceTestMessages) => {

  // Show the welcome message
  console.log(messages.header(options.product));

  // We are going to reconfirm that we are running on the default configuration (and fetch it if required)
  const cwd = await getAptDictory(options.cwd, true, options.force);

  // Get the load balancer URL for the cluster
  const baseUrl = await getClusterURL(cwd, options.product);

  // Get the path to the 'private' subdirectory of APT in which we store the test results for this specific run
  const runOutputDir = join(options.outputDir, `run${getRunForStage(stage)}`);

  // Check if there are existing test results for the current run
  if (existsSync(runOutputDir)) {
    // If there are existing test results, check if they were successful
    const existingResults = getResults(runOutputDir);
    if (existingResults['Summary run status'] === 'OK') {

      // Ask nicely if we need to remove the existing test results
      const overwriteExistingResults = options.force || await confirm({
        message: 'There are existing successful test results, do you want to overwrite these results?'
      });

      // If we need to overwrite the test results, we should do so
      if (overwriteExistingResults) {
        console.log('Removing existing test results');

        // Remove the directory
        rmSync(runOutputDir, { force: true });

      // If we are not allowed to overwrite the test results, there is no point in running this test
      } else {
        console.log(`Skipping performance ${stage} test execution, a successful test run was already completed`);
        return;
      }

    // If the test run was not successful, we are going to overwrite it without asking
    } else {
      // Remove the directory
      rmSync(runOutputDir, { force: true });
    }
  }

  // Make sure the output directory exists
  mkdirSync(options.outputDir, { recursive: true });

  // If we are running regression tests, we need to install the app (& run indexing tests for Jira)
  if (stage === 'regression') {
    // Install the app into the cluster
    await installApp(baseUrl, options.appKey, options.appLicense, options.force);

    // If we are doing this thing for Jira, we need to do the Lucene Index Testing
    if (options.product === 'jira') {
      await reindex(baseUrl, options.outputDir, options.force);
    }
  }

  // Inform the user that we will now start the regression testing
  console.log(messages.startPerformanceTest);

  // Allow users to set a different test duration (for validation purposes)
  const duration = await getDuration(options.force);

  // Ask for the AWS credentials
  const [ aws_access_key_id, aws_secret_access_key ] = await getAWSCredentials(options.product, options.force);

  // Write AWS credentials to disk
  persistAWSCredentials(cwd, aws_access_key_id, aws_secret_access_key);

  // Write test configuration to disk
  await persistTestConfiguration(cwd, options.product, baseUrl, duration, false, options.force);

  // Get the results directory (and make sure it is empty)
  const resultsBaseDir = await getResultsDirectory(cwd, options.product, options.force);

  // Run the damn test
  await runTest(cwd, options.environment, options.product);

  // Get the test results
  const results = getResults(resultsBaseDir);

  // Check if the test was executed successfully
  if (results['Summary run status'] !== 'OK') {

    // If not, let the people know and terminate
    console.log(messages.failure(cwd, options.product, options.environment, resultsBaseDir, results));
    throw new Error('Performance regression test failed');

  }

  // We have a successful test, so we should store the results in a 'private' subdirectory of APT
  await move(results.path as string, runOutputDir, { overwrite: true });

  // Celebrate our success!
  console.log(messages.success);

  // Ask permission to continue with the next step
  await waitForUserInput('Press a key to continue with the next step...', options.force);

}