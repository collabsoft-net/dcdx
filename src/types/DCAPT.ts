import { z } from 'zod';

import { SupportedApplications } from './Application';

export const PerformanceTestTypes = z.enum([
  'baseline',
  'regression'
]);

export const ScalabilityTestTypes = z.enum([
  'one-node',
  'two-node',
  'four-node'
]);

export const TestResults = z.enum([
  'path',
  'Summary run status',
  'Application nodes count',
  'Finished',
  'Compliant',
  'Success',
  'Has app-specific actions'
]);

export const ReportTypes = z.enum([
  'performance',
  'scalability'
]);

export const APTReportArgs = z.object({
  type: ReportTypes,
  timestamp: z.string(),
  outputDir: z.string(),
  cwd: z.string()
}).partial({
  outputDir: true
});

export const APTProvisionOptions = z.object({
  product: SupportedApplications,
  cwd: z.string(),
  environment: z.string(),
  appKey: z.string(),
  force: z.boolean()
}).partial({
  environment: true,
  appKey: true,
  force: true
});

export const APTPerformanceTestArgs = z.object({
  product: SupportedApplications,
  cwd: z.string(),
  outputDir: z.string(),
  environment: z.string(),
  appKey: z.string(),
  appLicense: z.string(),
  timestamp: z.string(),
  force: z.boolean()
}).partial({
  outputDir: true,
  timestamp: true,
  force: true
});

export const APTPerformanceTestOptions = z.object({
  product: SupportedApplications,
  cwd: z.string(),
  outputDir: z.string(),
  environment: z.string(),
  baseUrl: z.string(),
  aws_access_key_id: z.string(),
  aws_secret_access_key: z.string(),
  license: z.string(),
  appKey: z.string(),
  appLicense: z.string(),
  force: z.boolean()
}).partial({
  baseUrl: true,
  aws_access_key_id: true,
  aws_secret_access_key: true,
  appKey: true,
  appLicense: true,
  force: true
});

export const APTPerformanceTestMessages = z.object({
  header: z.function().args(SupportedApplications).returns(z.string()),
  readyForProvisioning: z.string(),
  startPerformanceTest: z.string(),
  startLuceneIndexing: z.string(),
  success: z.string(),
  failure: z.function().args(z.string(), SupportedApplications, z.string(), z.string(), z.record(TestResults, z.string().or(z.undefined())))
}).partial({
  startLuceneIndexing: true
});

export const APTPerformanceReportOptions = z.object({
  cwd: z.string(),
  outputDir: z.string(),
  force: z.boolean(),
}).partial({
  force: true
});

export const APTScalabilityTestArgs = z.object({
  product: SupportedApplications,
  cwd: z.string(),
  outputDir: z.string(),
  environment: z.string(),
  appKey: z.string(),
  appLicense: z.string(),
  timestamp: z.string(),
  force: z.boolean()
}).partial({
  outputDir: true,
  appLicense: true,
  timestamp: true,
  force: true
});

export const APTScalabilityTestOptions = z.object({
  product: SupportedApplications,
  cwd: z.string(),
  outputDir: z.string(),
  environment: z.string(),
  license: z.string(),
  appKey: z.string(),
  appLicense: z.string(),
  force: z.boolean()
}).partial({
  appKey: true,
  appLicense: true,
  force: true
});

export const APTScalabilityTestMessages = z.object({
  header: z.function().args(SupportedApplications, ScalabilityTestTypes).returns(z.string()),
  readyForProvisioning: z.string(),
  startScalabilityTest: z.string(),
  success: z.string(),
  failure: z.function().args(ScalabilityTestTypes, z.string(), SupportedApplications, z.string(), z.string(), z.record(TestResults, z.string().or(z.undefined())))
});

export const APTScalabilityReportOptions = z.object({
  cwd: z.string(),
  outputDir: z.string(),
  force: z.boolean(),
}).partial({
  force: true
});

export const APTTeardownArgs = z.object({
  product: SupportedApplications,
  cwd: z.string(),
  environment: z.string(),
  force: z.boolean()
}).partial({
  force: true
});

export const APTTeardownOptions = z.object({
  product: SupportedApplications,
  cwd: z.string(),
  environment: z.string(),
  aws_access_key_id: z.string(),
  aws_secret_access_key: z.string(),
  force: z.boolean()
}).partial({
  aws_access_key_id: true,
  aws_secret_access_key: true,
  force: true
});

export const APTArgs = z.intersection(
  APTProvisionOptions,
  APTPerformanceTestArgs,
  APTScalabilityTestArgs
);

export type TAPTArgs = z.infer<typeof APTArgs>;
export type TAPTProvisionOptions = z.infer<typeof APTProvisionOptions>;

export type TAPTReportArgs = z.infer<typeof APTReportArgs>;

export type TPerformanceTestTypes = z.infer<typeof PerformanceTestTypes>;
export type TAPTPerformanceTestArgs = z.infer<typeof APTPerformanceTestArgs>;
export type TAPTPerformanceTestOptions = z.infer<typeof APTPerformanceTestOptions>;
export type TAPTPerformanceTestMessages = z.infer<typeof APTPerformanceTestMessages>;
export type TAPTPerformanceReportOptions = z.infer<typeof APTPerformanceReportOptions>;

export type TScalabilityTestTypes = z.infer<typeof ScalabilityTestTypes>;
export type TAPTScalabilityTestArgs = z.infer<typeof APTScalabilityTestArgs>;
export type TAPTScalabilityTestOptions = z.infer<typeof APTScalabilityTestOptions>;
export type TAPTScalabilityTestMessages = z.infer<typeof APTScalabilityTestMessages>;
export type TAPTScalabilityReportOptions = z.infer<typeof APTScalabilityReportOptions>;

export type TAPTTeardownArgs = z.infer<typeof APTTeardownArgs>;
export type TAPTTeardownOptions = z.infer<typeof APTTeardownOptions>;

export type TTestResults = z.infer<typeof TestResults>;
export type TReportTypes = z.infer<typeof ReportTypes>;

