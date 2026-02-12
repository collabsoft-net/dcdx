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
  tag: z.string(),
  cwd: z.string(),
  environment: z.string(),
  license: z.string(),
  nodes: z.number(),
  force: z.boolean()
}).partial({
  tag: true,
  license: true,
  force: true
});

export const APTProvisionOptions = z.object({
  product: SupportedApplications,
  tag: z.string(),
  cwd: z.string(),
  environment: z.string(),
  license: z.string(),
  nodes: z.number(),
  force: z.boolean()
}).partial({
  tag: true,
  environment: true,
  license: true,
  nodes: true,
  force: true
});

export const APTPerformanceTestArgs = z.object({
  product: SupportedApplications,
  tag: z.string(),
  cwd: z.string(),
  outputDir: z.string(),
  environment: z.string(),
  license: z.string(),
  appKey: z.string(),
  archive: z.string(),
  appLicense: z.string(),
  restartAfterInstall: z.boolean(),
  timestamp: z.string(),
  force: z.boolean()
}).partial({
  tag: true,
  outputDir: true,
  license: true,
  appKey: true,
  archive: true,
  timestamp: true,
  restartAfterInstall: true,
  force: true
});

export const APTPerformanceTestOptions = z.object({
  stage: PerformanceTestTypes,
  product: SupportedApplications,
  tag: z.string(),
  cwd: z.string(),
  outputDir: z.string(),
  environment: z.string(),
  baseUrl: z.string(),
  aws_access_key_id: z.string(),
  aws_secret_access_key: z.string(),
  license: z.string(),
  appKey: z.string().optional(),
  archive: z.string().optional(),
  appLicense: z.string(),
  restartAfterInstall: z.boolean(),
  force: z.boolean()
}).partial({
  tag: true,
  baseUrl: true,
  aws_access_key_id: true,
  aws_secret_access_key: true,
  appLicense: true,
  restartAfterInstall: true,
  force: true
}).superRefine((input, ctx) => {
  if (input.stage === 'regression' && (typeof input.appKey === 'undefined' && typeof input.archive === 'undefined')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either `appKey` or `archive` argument needs to be provided'
    });
    return false;
  }
  return true;
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
  tag: z.string(),
  cwd: z.string(),
  outputDir: z.string(),
  environment: z.string(),
  license: z.string(),
  appKey: z.string(),
  archive: z.string(),
  appLicense: z.string(),
  restartAfterInstall: z.boolean(),
  jmeter: z.boolean(),
  locust: z.boolean(),
  timestamp: z.string(),
  force: z.boolean()
}).partial({
  tag: true,
  outputDir: true,
  license: true,
  appKey: true,
  archive: true,
  appLicense: true,
  restartAfterInstall: true,
  jmeter: true,
  locust: true,
  timestamp: true,
  force: true
});

export const APTScalabilityTestOptions = z.object({
  product: SupportedApplications,
  tag: z.string(),
  cwd: z.string(),
  outputDir: z.string(),
  environment: z.string(),
  license: z.string(),
  appKey: z.string().optional(),
  archive: z.string().optional(),
  appLicense: z.string(),
  restartAfterInstall: z.boolean(),
  jmeter: z.boolean(),
  locust: z.boolean(),
  force: z.boolean()
}).partial({
  tag: true,
  appLicense: true,
  restartAfterInstall: true,
  jmeter: true,
  locust: true,
  force: true
}).superRefine((input, ctx) => {
  if (typeof input.appKey === 'undefined' && typeof input.archive === 'undefined') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either `appKey` or `archive` argument needs to be provided'
    });
    return false;
  }
  return true;
});

export const APTScalabilityReportArgs = APTPerformanceReportArgs.extend({
  type: ReportTypes.refine(item => item === 'scalability'),
  resultsDir3: z.string(),
  product: SupportedApplications
});

export const APTScalabilityReportOptions = APTPerformanceReportOptions.extend({
  product: SupportedApplications,
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

export const APTRestartArgs = APTTeardownArgs.extend({});
export const APTRestartOptions = APTTeardownOptions.extend({});

export const APTDependencyTreeArgs = z.object({
  groupId: z.string(),
  artifactId: z.string(),
  appKey: z.string(),
  archive: z.string(),
  activateProfiles: z.string(),
  outputFile: z.string()
}).partial({
  appKey: true,
  archive: true,
  activateProfiles: true,
  outputFile: true
});

export const APTDependencyTreeOptions = z.object({
  groupId: z.string(),
  artifactId: z.string(),
  appKey: z.string().optional(),
  archive: z.string().optional(),
  activateProfiles: z.string(),
  outputFile: z.string()
}).partial({
  activateProfiles: true
}).superRefine((input, ctx) => {
  if (typeof input.appKey === 'undefined' && typeof input.archive === 'undefined') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either `appKey` or `archive` argument needs to be provided'
    });
    return false;
  }
  return true;
});

export const APTSCAArgs = z.object({
  nvdApiKey: z.string(),
  appKey: z.string(),
  archive: z.string(),
  dataDir: z.string(),
  failOnError: z.boolean(),
  outputDir: z.string()
}).partial({
  appKey: true,
  archive: true,
  dataDir: true,
  failOnError: true,
  outputDir: true
});

export const APTSCAOptions = z.object({
  nvdApiKey: z.string(),
  appKey: z.string().optional(),
  archive: z.string().optional(),
  dataDir: z.string(),
  failOnError: z.boolean(),
  outputDir: z.string()
}).partial({
  dataDir: true
}).superRefine((input, ctx) => {
  if (typeof input.appKey === 'undefined' && typeof input.archive === 'undefined') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either `appKey` or `archive` argument needs to be provided'
    });
    return false;
  }
  return true;
});

export const APTArgs = z.intersection(
  APTProvisionOptions,
  z.intersection(APTPerformanceTestArgs, APTScalabilityTestArgs)
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

export type TAPTRestartArgs = z.infer<typeof APTRestartArgs>;
export type TAPTRestartOptions = z.infer<typeof APTRestartOptions>;

export type TAPTTeardownArgs = z.infer<typeof APTTeardownArgs>;
export type TAPTTeardownOptions = z.infer<typeof APTTeardownOptions>;

export type TTestResults = z.infer<typeof TestResults>;
export type TReportTypes = z.infer<typeof ReportTypes>;

export type TAPTDependencyTreeArgs = z.infer<typeof APTDependencyTreeArgs>;
export type TAPTDependencyTreeOptions = z.infer<typeof APTDependencyTreeOptions>;

export type TAPTSCAArgs = z.infer<typeof APTSCAArgs>;
export type TAPTSCAOptions = z.infer<typeof APTSCAOptions>;