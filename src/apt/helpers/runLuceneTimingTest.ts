import { mkdirSync } from 'fs';
import { join } from 'path';

import { TAPTPerformanceTestOptions, TAPTTestMessages } from '../../types/DCAPT';
import { emptyLine } from '../messages';
import { install } from './dcapt';
import { getAptDictory } from './getAptDirectory';
import { getAWSCredentials } from './getAWSCredentials';
import { getClusterURL } from './getClusterURL';
import { installAppInCluster } from './installAppInCluster';
import { persistClusterConfiguration } from './persistClusterConfiguration';
import { persistAWSCredentials } from './persistsAWSCredentials';
import { reindex } from './reindex';
import { waitForUserInput } from './waitForUserInput';

export const runLuceneTimingTest = async (options: TAPTPerformanceTestOptions, messages: TAPTTestMessages) => {

  // Show the welcome message
  console.log(messages.header(options.product, options.stage));

  // We are going to reconfirm that we are running on the default configuration (and fetch it if required)
  const cwd = await getAptDictory(options.cwd, true, options.force);

  // Get the path to the 'private' subdirectory of APT in which we store the test results
  const runOutputDir = join(options.outputDir, `reindex`);

  // Make sure the output directory exists
  mkdirSync(runOutputDir, { recursive: true });

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
    persistClusterConfiguration({
      product: options.product,
      tag: options.tag,
      cwd,
      environment: options.environment,
      license: options.license,
      nodes: 1
    });

    // Run the DCAPT install script
    await install(cwd);

  }

  // Get the load balancer URL for the cluster
  const baseUrl = options.baseUrl || await getClusterURL(cwd, options.product);

  // Install the app into the cluster
  await installAppInCluster({
    baseUrl,
    appKey: options.appKey,
    archive: options.archive,
    license: options.appLicense,
    username: 'admin',
    password: 'admin',
    restartAfterInstall: options.restartAfterInstall,
    force: options.force
  });

  // Inform the user that we will now start the Lucene index test
  console.log(messages.startTest);

  // Ok, we're ready to run the Lucene Index Timing test
  await reindex(baseUrl, runOutputDir, options.force);

  // Celebrate our success!
  console.log(messages.success);

}