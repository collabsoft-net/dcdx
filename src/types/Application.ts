import { z } from 'zod';

import { DatabaseEngine, SupportedDatabaseEngines } from './Database';

export interface Application {
  name: TSupportedApplications;
  database: DatabaseEngine;
  logFilePath: string;

  start(): Promise<void>;
  stop(): Promise<void>;
  reset(): Promise<void>;
}

export const SupportedApplications = z.enum([
  'jira',
  'confluence',
  'bitbucket',
  'bamboo'
]);

export const ApplicationOptions = z.object({
  name: SupportedApplications,
  tag: z.string().default('latest'),
  database: SupportedDatabaseEngines.default('postgresql'),
  port: z.string().transform(Number).refine(item => !isNaN(item)),
  contextPath: z.string(),
  xms: z.string().default('1024m'),
  xmx: z.string().default('1024m'),
  watch: z.boolean().default(false),
  ext: z.array(z.string()),
  install: z.boolean(),
  outputDirectory: z.string(),
  activateProfiles: z.string(),
  clean: z.boolean().default(false),
  prune: z.boolean().default(false),
  debug: z.boolean().default(true),
  cwd: z.string()
}).partial({
  activateProfiles: true,
  contextPath: true,
  cwd: true
});

export type TApplicationOptions = z.infer<typeof ApplicationOptions>;
export type TSupportedApplications = z.infer<typeof SupportedApplications>;