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


export const APTTestMessages = z.object({
  header: z.function().args(SupportedApplications, PerformanceTestTypes.or(ScalabilityTestTypes)).returns(z.string()),
  readyForProvisioning: z.string(),
  startTest: z.string(),
  success: z.string(),
  failure: z.function().args(PerformanceTestTypes.or(ScalabilityTestTypes), z.string(), SupportedApplications, z.string(), z.string(), z.record(TestResults, z.string().or(z.undefined())))
});

export const APTProvisionArgs = z.object({
  product: SupportedApplications,
  cwd: z.string(),
  environment: z.string(),
  license: z.string(),
  nodes: z.number(),
  force: z.boolean()
}).partial({
  license: true,
  force: true
});

export const APTProvisionOptions = z.object({
  product: SupportedApplications,
  cwd: z.string(),
  environment: z.string(),
  license: z.string(),
  nodes: z.number(),
  appKey: z.string(),
  force: z.boolean()
}).partial({
  environment: true,
  license: true,
  nodes: true,
  appKey: true,
  force: true
});

export const APTPerformanceTestArgs = z.object({
  product: SupportedApplications,
  cwd: z.string(),
  outputDir: z.string(),
  environment: z.string(),
  license: z.string(),
  appKey: z.string(),
  appLicense: z.string(),
  timestamp: z.string(),
  force: z.boolean()
}).partial({
  outputDir: true,
  license: true,
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

export const APTPerformanceReportArgs = z.object({
  type: ReportTypes.refine(item => item === 'performance'),
  timestamp: z.string(),
  resultsDir1: z.string(),
  resultsDir2: z.string(),
  outputDir: z.string(),
  cwd: z.string()
}).partial({
  outputDir: true
});

export const APTPerformanceReportOptions = z.object({
  cwd: z.string(),
  resultsDir1: z.string(),
  resultsDir2: z.string(),
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
  license: z.string(),
  appKey: z.string(),
  appLicense: z.string(),
  timestamp: z.string(),
  force: z.boolean()
}).partial({
  outputDir: true,
  license: true,
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

export const APTScalabilityReportArgs = APTPerformanceReportArgs.extend({
  type: ReportTypes.refine(item => item === 'scalability'),
  resultsDir3: z.string(),
});

export const APTScalabilityReportOptions = APTPerformanceReportOptions.extend({
  resultsDir3: z.string(),
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
export type TAPTTestMessages = z.infer<typeof APTTestMessages>;

export type TAPTProvisionArgs = z.infer<typeof APTProvisionArgs>;
export type TAPTProvisionOptions = z.infer<typeof APTProvisionOptions>;

export type TAPTPerformanceReportArgs = z.infer<typeof APTPerformanceReportArgs>;
export type TAPTScalabilityReportArgs = z.infer<typeof APTScalabilityReportArgs>;

export type TPerformanceTestTypes = z.infer<typeof PerformanceTestTypes>;
export type TAPTPerformanceTestArgs = z.infer<typeof APTPerformanceTestArgs>;
export type TAPTPerformanceTestOptions = z.infer<typeof APTPerformanceTestOptions>;
export type TAPTPerformanceReportOptions = z.infer<typeof APTPerformanceReportOptions>;

export type TScalabilityTestTypes = z.infer<typeof ScalabilityTestTypes>;
export type TAPTScalabilityTestArgs = z.infer<typeof APTScalabilityTestArgs>;
export type TAPTScalabilityTestOptions = z.infer<typeof APTScalabilityTestOptions>;
export type TAPTScalabilityReportOptions = z.infer<typeof APTScalabilityReportOptions>;

export type TAPTTeardownArgs = z.infer<typeof APTTeardownArgs>;
export type TAPTTeardownOptions = z.infer<typeof APTTeardownOptions>;

export type TTestResults = z.infer<typeof TestResults>;
export type TReportTypes = z.infer<typeof ReportTypes>;

