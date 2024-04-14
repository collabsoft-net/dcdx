import { SupportedDatabaseEngines } from './SupportedDatabaseEngines';

export type ApplicationOptions = {
  version: string;
  database: SupportedDatabaseEngines;
  port: number;
  contextPath?: string;
  quickReload?: boolean;
  license?: string;
  debug?: boolean;
}