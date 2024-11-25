import { confirm } from '@inquirer/prompts';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { move } from 'fs-extra';
import { join } from 'path';

import { TAPTPerformanceTestMessages, TAPTPerformanceTestOptions, TPerformanceTestTypes } from '../../types/DCAPT';
import { emptyLine } from '../messages';
import { install, runTest } from './dcapt';
import { getAptDictory } from './getAptDirectory';
import { getAWSCredentials } from './getAWSCredentials';
import { getClusterURL } from './getClusterURL';
import { getDuration } from './getDuration';
import { getResults } from './getResults';
import { getResultsDirectory } from './getResultsDirectory';
import { getRunForStage } from './getRunForStage';
import { installApp } from './installApp';
import { persistClusterConfiguration } from './persistClusterConfiguration';
import { persistAWSCredentials } from './persistsAWSCredentials';
import { persistTestConfiguration } from './persistTestConfiguration';
import { reindex } from './reindex';
import { waitForUserInput } from './waitForUserInput';

export const runPerformanceTest = async (stage: TPerformanceTestTypes, options: TAPTPerformanceTestOptions, messages: TAPTPerformanceTestMessages) => {

  // Show the welcome message
  console.log(messages.header(options.product));

  // We are going to reconfirm that we are running on the default configuration (and fetch it if required)
  const cwd = await getAptDictory(options.cwd, true, options.force);

  // Get the path to the 'private' subdirectory of APT in which we store the test results
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

  // Ask for the AWS credentials
  const [ aws_access_key_id, aws_secret_access_key ] = (options.aws_access_key_id && options.aws_secret_access_key)
    ? [ options.aws_access_key_id, options.aws_secret_access_key ]
    : await getAWSCredentials(options.product, options.force);

  // Write AWS credentials to disk
  persistAWSCredentials(cwd, aws_access_key_id, aws_secret_access_key);

  // Check if we already have a provisioned cluster available
  // If not, we should provision it as part of the test run
  if (!options.baseUrl) {

    // Inform the user that we will now start the scalability benchmark
    console.log(messages.readyForProvisioning);
    await waitForUserInput('Press a key to prepare the AWS environment for performance benchmark testing...', options.force);
    emptyLine();

    // Write Terraform variables to disk (one-node cluster)
    persistClusterConfiguration(cwd, options.environment, options.product, options.license, 1);

    // Run the DCAPT install script
    await install(cwd);

  }

  // Inform the user that we will now start the scalability benchmark
  console.log(messages.startPerformanceTest);

  // Get the load balancer URL for the cluster
  const baseUrl = options.baseUrl || await getClusterURL(cwd, options.product);

  // If we are running regression tests, we need to install the app (& run indexing tests for Jira)
  if (stage === 'regression') {
    // Install the app into the cluster
    await installApp(baseUrl, options.appKey, options.appLicense, options.force);

    // If we are doing this thing for Jira, we need to do the Lucene Index Testing
    if (options.product === 'jira') {
      await reindex(baseUrl, options.outputDir, options.force);
    }
  }

  // Allow users to set a different test duration (for validation purposes)
  const duration = await getDuration(options.force);

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
  console.log(`  Copying test results to ${runOutputDir}`);
  await move(results.path as string, runOutputDir, { overwrite: true });

  // Celebrate our success!
  console.log(messages.success);

  // Ask permission to continue with the next step
  await waitForUserInput('Press a key to continue with the next step...', options.force);

}