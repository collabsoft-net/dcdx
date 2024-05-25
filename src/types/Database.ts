import { z } from 'zod';

import versions from '../../assets/versions.json';

export interface DatabaseEngine {
  url: string;
  options: TDatabaseOptions;
  start(clean?: boolean): Promise<void>;
  stop(prune?: boolean): Promise<void>;
  run(sql: string | { query: string; values: unknown[] }): Promise<void>;
}

export const SupportedDatabaseEngines = z.enum([
  'postgresql',
  'mysql',
  'mssql'
]);

export const SupportedMSSQLEditions = z.enum([
  'Developer',
  'Express',
  'Standard',
  'Enterprise',
  'EnterpriseCore'
]);

export const DatabaseOptions = z.object({
  name: SupportedDatabaseEngines,
  port: z.number().or(z.string().transform(Number).refine(item => !isNaN(item))),
  database: z.string().default('dcdx'),
  username: z.string().default('dcdx'),
  password: z.string().default('dcdx'),
  clean: z.boolean().default(false),
  prune: z.boolean().default(false),
  verbose: z.boolean().default(false),
  driver: z.string()
});

export const PostgreSQLOptions = DatabaseOptions.extend({
  name: SupportedDatabaseEngines.refine(item => item === SupportedDatabaseEngines.Values.postgresql).default(SupportedDatabaseEngines.Values.postgresql),
  tag: z.string().refine(item => versions[SupportedDatabaseEngines.Values.postgresql].includes(item)).default('latest'),
  port: z.number().or(z.string().transform(Number).refine(item => !isNaN(item))).default(5432),
  driver: z.string().refine(item => item === 'org.postgresql.Driver').default('org.postgresql.Driver')
});

export const MySQLOptions = DatabaseOptions.extend({
  name: SupportedDatabaseEngines.refine(item => item === SupportedDatabaseEngines.Values.mysql).default(SupportedDatabaseEngines.Values.mysql),
  tag: z.string().refine(item => versions[SupportedDatabaseEngines.Values.mysql].includes(item)).default('latest'),
  port: z.number().or(z.string().transform(Number).refine(item => !isNaN(item))).default(3306),
  driver: z.string().refine(item => item === 'com.mysql.jdbc.Driver').default('com.mysql.jdbc.Driver')
});

export const MSSQLOptions = DatabaseOptions.extend({
  name: SupportedDatabaseEngines.refine(item => item === SupportedDatabaseEngines.Values.mssql).default(SupportedDatabaseEngines.Values.mssql),
  tag: z.string().refine(item => versions[SupportedDatabaseEngines.Values.mssql].includes(item)).default('latest'),
  edition: SupportedMSSQLEditions.default('Developer'),
  port: z.number().or(z.string().transform(Number).refine(item => !isNaN(item))).default(1433),
  username: z.string().refine(item => item === 'sa').default('sa'),
  password: z.string().default('DataCenterDX!'),
  driver: z.string().refine(item => item === 'com.microsoft.sqlserver.jdbc.SQLServerDriver').default('com.microsoft.sqlserver.jdbc.SQLServerDriver')
});

export type TDatabaseOptions = z.infer<typeof DatabaseOptions>;
export type TPostgreSQLOptions = z.infer<typeof PostgreSQLOptions>;
export type TMySQLOptions = z.infer<typeof MySQLOptions>;
export type TMSSQLOptions = z.infer<typeof MSSQLOptions>;
export type TSupportedDatabaseEngines = z.infer<typeof SupportedDatabaseEngines>;
export type TSupportedMSSQLEditions = z.infer<typeof SupportedMSSQLEditions>;