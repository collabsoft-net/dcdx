
import { TAPTScalabilityTestArgs } from '../types/DCAPT';
import { generateScalabilityReport } from './helpers/generateScalabilityReport';
import { getOutputDirectory } from './helpers/getOutputDirectory';
import { provisionCluster } from './helpers/provisionCluster';
import { runScalabilityTest } from './helpers/runScalabilityTest';
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
    appKey: options.appKey,
    force: options.force
  }, false);

  // Run the scalability test with a one-node cluster
  await runScalabilityTest('one-node', {
    product: options.product,
    cwd,
    outputDir,
    environment,
    license,
    appKey: options.appKey,
    appLicense: options.appLicense,
    force: options.force
  }, ScalabilityTestMessages);

  // Run the scalability test with a two-node cluster
  await runScalabilityTest('two-node', {
    product: options.product,
    cwd,
    outputDir,
    environment,
    license,
    appKey: options.appKey,
    appLicense: options.appLicense,
    force: options.force
  }, ScalabilityTestMessages);

  // Run the scalability test with a one-node cluster
  await runScalabilityTest('four-node', {
    product: options.product,
    cwd,
    outputDir,
    environment,
    license,
    appKey: options.appKey,
    appLicense: options.appLicense,
    force: options.force
  }, ScalabilityTestMessages);

  // Generate the scalability report
  await generateScalabilityReport({
    cwd,
    outputDir,
    force: options.force
  });
}