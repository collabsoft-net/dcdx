
import { PerformanceTestTypes, TAPTPerformanceTestArgs } from '../types/DCAPT';
import { generatePerformanceReport } from './helpers/generatePerformanceReport';
import { getOutputDirectory } from './helpers/getOutputDirectory';
import { provisionCluster } from './helpers/provisionCluster'
import { runLuceneTimingTest } from './helpers/runLuceneTimingTest';
import { runPerformanceTest } from './helpers/runPerformanceTest';
import { LuceneTimingTest, Run1, Run2 } from './messages'

export const Performance = async (options: TAPTPerformanceTestArgs) => {

  // Get the output directory for the test results
  const outputDir = getOutputDirectory(options.outputDir, options.timestamp);

  // Provision the cluster
  const {
    cwd,
    environment,
    baseUrl,
    aws_access_key_id,
    aws_secret_access_key,
    license
  } = await provisionCluster({
    product: options.product,
    cwd: options.cwd,
    environment: options.environment,
    appKey: options.appKey,
    force: options.force
  }, true);

  // Run the baseline performance test (run 1)
  await runPerformanceTest(PerformanceTestTypes.Values.baseline, {
    product: options.product,
    cwd,
    outputDir,
    environment,
    baseUrl,
    aws_access_key_id,
    aws_secret_access_key,
    license,
    appKey: options.appKey,
    force: options.force
  }, Run1);

  // Run the lucene timing test (part of run 2)
  await runLuceneTimingTest(PerformanceTestTypes.Values.regression, {
    product: options.product,
    cwd,
    outputDir,
    environment,
    baseUrl,
    aws_access_key_id,
    aws_secret_access_key,
    license,
    appKey: options.appKey,
    force: options.force
  }, LuceneTimingTest)

  // Run the performance regression test (run 2)
  await runPerformanceTest(PerformanceTestTypes.Values.regression, {
    product: options.product,
    cwd,
    outputDir,
    environment,
    baseUrl,
    aws_access_key_id,
    aws_secret_access_key,
    license,
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