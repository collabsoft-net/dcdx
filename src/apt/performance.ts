
import { PerformanceTestTypes, TAPTPerformanceTestArgs } from '../types/DCAPT';
import { generatePerformanceReport } from './helpers/generatePerformanceReport';
import { getOutputDirectory } from './helpers/getOutputDirectory';
import { provisionCluster } from './helpers/provisionCluster'
import { runPerformanceTest } from './helpers/runPerformanceTest';
import { Run1, Run2 } from './messages'

export const Performance = async (options: TAPTPerformanceTestArgs) => {

  // Get the output directory for the test results
  const outputDir = getOutputDirectory(options.outputDir, options.timestamp);

  // Provision the cluster
  const {
    cwd,
    environment,
  } = await provisionCluster({
    product: options.product,
    cwd: options.cwd,
    environment: options.environment,
    appKey: options.appKey,
    force: options.force
  }, true);

  // Run the baseline performance test
  await runPerformanceTest(PerformanceTestTypes.Values.baseline, {
    product: options.product,
    cwd,
    outputDir,
    environment,
    appKey: options.appKey,
    force: options.force
  }, Run1);

  // Run the performance regression test
  await runPerformanceTest(PerformanceTestTypes.Values.regression, {
    product: options.product,
    cwd,
    outputDir,
    environment,
    appKey: options.appKey,
    force: options.force
  }, Run2);

  // Generate the performance report
  await generatePerformanceReport({
    cwd,
    outputDir,
    force: options.force
  });

}