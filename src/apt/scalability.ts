
import { join } from 'path';

import { APTScalabilityReportOptions, APTScalabilityTestOptions, TAPTScalabilityTestArgs } from '../types/DCAPT';
import { generateScalabilityReport } from './helpers/generateScalabilityReport';
import { getOutputDirectory } from './helpers/getOutputDirectory';
import { getRunForStage } from './helpers/getRunForStage';
import { provisionCluster } from './helpers/provisionCluster';
import { runScalabilityTest } from './helpers/runScalabilityTest';
import { waitForUserInput } from './helpers/waitForUserInput';
import { ScalabilityTestMessages } from './messages';

export const Scalability = async (options: TAPTScalabilityTestArgs) => {

  // Get the output directory for the test results
  const outputDir = getOutputDirectory(options.outputDir, options.timestamp);

  // Provision the cluster
  const {
    cwd,
    environment,
    license
  } = await provisionCluster({
    product: options.product,
    cwd: options.cwd,
    environment: options.environment,
    license: options.license,
    force: options.force
  }, false);

  // Ask permission to continue with the next step
  await waitForUserInput('Press a key to continue with the next step...', options.force);

  // Run the scalability test with a one-node cluster
  await runScalabilityTest('one-node', APTScalabilityTestOptions.parse({
    product: options.product,
    cwd,
    outputDir,
    environment,
    license,
    appKey: options.appKey,
    archive: options.archive,
    appLicense: options.appLicense,
    restartAfterInstall: options.restartAfterInstall,
    locust: options.locust,
    force: options.force
  }), ScalabilityTestMessages);

  // Ask permission to continue with the next step
  await waitForUserInput('Press a key to continue with the next step...', options.force);

  // Run the scalability test with a two-node cluster
  await runScalabilityTest('two-node', APTScalabilityTestOptions.parse({
    product: options.product,
    cwd,
    outputDir,
    environment,
    license,
    appKey: options.appKey,
    archive: options.archive,
    appLicense: options.appLicense,
    restartAfterInstall: options.restartAfterInstall,
    locust: options.locust,
    force: options.force
  }), ScalabilityTestMessages);

  // Ask permission to continue with the next step
  await waitForUserInput('Press a key to continue with the next step...', options.force);

  // Run the scalability test with a one-node cluster
  await runScalabilityTest('four-node', APTScalabilityTestOptions.parse({
    product: options.product,
    cwd,
    outputDir,
    environment,
    license,
    appKey: options.appKey,
    archive: options.archive,
    appLicense: options.appLicense,
    restartAfterInstall: options.restartAfterInstall,
    locust: options.locust,
    force: options.force
  }), ScalabilityTestMessages);

  // Ask permission to continue with the next step
  await waitForUserInput('Press a key to continue with the next step...', options.force);

  // Generate the scalability report
  await generateScalabilityReport(APTScalabilityReportOptions.parse({
    cwd,
    product: options.product,
    resultsDir1: join(outputDir, `run${getRunForStage('one-node')}`),
    resultsDir2: join(outputDir, `run${getRunForStage('two-node')}`),
    resultsDir3: join(outputDir, `run${getRunForStage('four-node')}`),
    outputDir,
    force: options.force
  }));
}