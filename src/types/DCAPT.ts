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
  cwd: z.string()
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
  environment: z.string(),
  appKey: z.string(),
  appLicense: z.string(),
  timestamp: z.string(),
  force: z.boolean()
}).partial({
  timestamp: true,
  force: true
});

export const APTPerformanceTestOptions = z.object({
  product: SupportedApplications,
  cwd: z.string(),
  outputDir: z.string(),
  environment: z.string(),
  appKey: z.string(),
  appLicense: z.string(),
  force: z.boolean()
}).partial({
  appKey: true,
  appLicense: true,
  force: true
});

export const APTPerformanceTestMessages = z.object({
  header: z.function().args(SupportedApplications).returns(z.string()),
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
  environment: z.string(),
  appKey: z.string(),
  appLicense: z.string(),
  timestamp: z.string(),
  force: z.boolean()
}).partial({
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


// export const APTOptions = z.object({
//   product: SupportedApplications,
//   cwd: z.string(),
//   environment: z.string(),
//   appKey: z.string(),
//   force: z.boolean()
// }).partial({
//   product: true,
//   environment: true,
//   appKey: true,
//   force: true
// });

// export const APTPerformanceTestOptions = z.object({
//   product: SupportedApplications,
//   cwd: z.string(),
//   environment: z.string(),
//   appKey: z.string(),
//   testd: z.string(),
//   force: z.boolean()
// }).partial({
//   force: true
// });



// export const APTInitOptions = z.object({
//   product: SupportedApplications,
//   cwd: z.string(),
//   environment: z.string(),
//   appKey: z.string(),
//   force: z.boolean()
// }).partial({
//   environment: true,
//   appKey: true,
//   force: true
// });


// export const APTRun1Options = z.object({
//   product: SupportedApplications,
//   cwd: z.string(),
//   environment: z.string(),
//   appKey: z.string(),
//   force: z.boolean()
// }).partial({
//   appKey: true,
//   force: true
// });

// export const APTJiraRun1Options = z.object({
//   product: SupportedApplications,
//   cwd: z.string(),
//   environment: z.string(),
//   appKey: z.string(),
//   testRunId: z.string(),
//   force: z.boolean()
// }).partial({
//   appKey: true,
//   force: true
// });

// export const APTRun2Options = z.object({
//   product: SupportedApplications,
//   cwd: z.string(),
//   environment: z.string(),
//   appKey: z.string(),
//   force: z.boolean()
// }).partial({
//   appKey: true,
//   force: true
// });

// export const APTJiraRun2Options = z.object({
//   product: SupportedApplications,
//   cwd: z.string(),
//   environment: z.string(),
//   appKey: z.string(),
//   testRunId: z.string(),
//   force: z.boolean()
// }).partial({
//   appKey: true,
//   force: true
// });

// export const APTRun3Options = z.object({
//   product: SupportedApplications,
//   cwd: z.string(),
//   environment: z.string(),
//   appKey: z.string(),
//   force: z.boolean()
// }).partial({
//   appKey: true,
//   force: true
// });

// export const APTJiraRun3Options = z.object({
//   product: SupportedApplications,
//   cwd: z.string(),
//   environment: z.string(),
//   appKey: z.string(),
//   testRunId: z.string(),
//   force: z.boolean()
// }).partial({
//   appKey: true,
//   force: true
// });

// export const APTTeardownOptions = z.object({
//   product: SupportedApplications,
//   cwd: z.string(),
//   environment: z.string(),
//   aws_access_key_id: z.string(),
//   aws_secret_access_key: z.string(),
//   force: z.boolean()
// }).partial({
//   aws_access_key_id: true,
//   aws_secret_access_key: true,
//   force: true
// });

// export const APTJiraTeardownOptions = z.object({
//   product: SupportedApplications,
//   cwd: z.string(),
//   environment: z.string(),
//   force: z.boolean()
// }).partial({
//   force: true
// });

// export type TAPTPerformanceTestArgs = z.infer<typeof APTPerformanceTestOptions>;
// export type TAPTPerformanceTestOptions = z.infer<typeof APTPerformanceTestOptions>;

// export type TAPTScalabilityTestArgs = z.infer<typeof APTPerformanceTestOptions>;
// export type TAPTScalabilityTestOptions = z.infer<typeof APTPerformanceTestOptions>;




// export type TAptInitOptions = z.infer<typeof APTInitOptions>;
// export type TAPTProvisionOptions = z.infer<typeof APTProvisionOptions>;

// export type TAPTRun1Options = z.infer<typeof APTRun1Options>;
// export type TAPTJiraRun1Options = z.infer<typeof APTJiraRun1Options>;

// export type TAPTRun2Options = z.infer<typeof APTRun2Options>;
// export type TAPTJiraRun2Options = z.infer<typeof APTJiraRun2Options>;

// export type TAPTRun3Options = z.infer<typeof APTRun3Options>;
// export type TAPTJiraRun3Options = z.infer<typeof APTJiraRun3Options>;

// export type TAPTTeardownOptions = z.infer<typeof APTTeardownOptions>;
// export type TAPTJiraTeardownOptions = z.infer<typeof APTJiraTeardownOptions>;

