import EventEmitter from 'events';

import { DatabaseOptions } from './DatabaseOptions';
import { SupportedDatabaseDrivers } from './SupportedDatabaseDrivers';
import { SupportedDatabaseEngines } from './SupportedDatabaseEngines';

export interface DatabaseEngine extends EventEmitter {
  name: SupportedDatabaseEngines;
  url: string;
  driver: SupportedDatabaseDrivers;
  options: DatabaseOptions;
  start(clean?: boolean): Promise<void>;
  stop(prune?: boolean): Promise<void>;
  run(sql: string | { query: string; values: unknown[] }): Promise<[unknown[], unknown]|null>;
}