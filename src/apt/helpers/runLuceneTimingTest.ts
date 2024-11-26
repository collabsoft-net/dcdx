import { mkdirSync } from 'fs';
import { join } from 'path';

import { TAPTPerformanceTestOptions, TAPTTestMessages, TPerformanceTestTypes } from '../../types/DCAPT';
import { emptyLine } from '../messages';
import { install } from './dcapt';
import { getAptDictory } from './getAptDirectory';
import { getAWSCredentials } from './getAWSCredentials';
import { getClusterURL } from './getClusterURL';
import { getRunForStage } from './getRunForStage';
import { installApp } from './installApp';
import { persistClusterConfiguration } from './persistClusterConfiguration';
import { persistAWSCredentials } from './persistsAWSCredentials';
import { reindex } from './reindex';
import { waitForUserInput } from './waitForUserInput';

export const runLuceneTimingTest = async (stage: TPerformanceTestTypes, options: TAPTPerformanceTestOptions, messages: TAPTTestMessages) => {

  // Show the welcome message
  console.log(messages.header(options.product, stage));

  // We are going to reconfirm that we are running on the default configuration (and fetch it if required)
  const cwd = await getAptDictory(options.cwd, true, options.force);

  // Get the path to the 'private' subdirectory of APT in which we store the test results
  const runOutputDir = join(options.outputDir, `run${getRunForStage(stage)}`);

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
  console.log(messages.startTest);

  // Get the load balancer URL for the cluster
  const baseUrl = options.baseUrl || await getClusterURL(cwd, options.product);

  // Install the app into the cluster
  await installApp(baseUrl, options.appKey, options.appLicense, options.force);

  // If we are doing this thing for Jira, we need to do the Lucene Index Testing
  if (options.product === 'jira') {
    await reindex(baseUrl, runOutputDir, options.force);
  }

  // Celebrate our success!
  console.log(messages.success);

  // Ask permission to continue with the next step
  await waitForUserInput('Press a key to continue with the next step...', options.force);

}