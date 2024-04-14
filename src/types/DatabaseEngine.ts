import EventEmitter from 'events';

import { DatabaseOptions } from './DatabaseOptions';
import { SupportedApplications } from './SupportedApplications';
import { SupportedDatabaseDrivers } from './SupportedDatabaseDrivers';
import { SupportedDatabaseEngines } from './SupportedDatabaseEngines';

export interface DatabaseEngine extends EventEmitter {
  name: SupportedDatabaseEngines;
  url: string;
  driver: SupportedDatabaseDrivers;
  options: DatabaseOptions;
  start(): Promise<void>;
  start(application: SupportedApplications, version: string): Promise<void>;
  stop(): Promise<void>;
  run(sql: string | { query: string; values: unknown[] }): Promise<[unknown[], unknown]|null>;
}