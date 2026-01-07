/*
  Code atrribution
  borrowed some logic for loading configuration files from ESLint
  https://github.com/eslint/eslint/blob/main/lib/config/config-loader.js
*/

import { existsSync, statSync } from 'fs';
import { isAbsolute, join } from 'path';
import { pathToFileURL } from 'url';

import { Config, DCDX } from '../types/Config';

export const getConfig = async (path?: string, cwd?: string): Promise<DCDX> => {
  let config;
  const directory = cwd || process.cwd();
  const configFile = path || 'dcdx.config.mjs';
  const configPath = isAbsolute(configFile) && existsSync(configFile) ? configFile : join(directory, configFile);

  if (existsSync(configPath)) {
    /*
    * Explanation copied from ESLint
    *
    * Append a query with the config file's modification time (`mtime`) in order
    * to import the current version of the config file. Without the query, `import()` would
    * cache the config file module by the pathname only, and then always return
    * the same version (the one that was actual when the module was imported for the first time).
    *
    * This ensures that the config file module is loaded and executed again
    * if it has been changed since the last time it was imported.
    * If it hasn't been changed, `import()` will just return the cached version.
    *
    * Note that we should not overuse queries (e.g., by appending the current time
    * to always reload the config file module) as that could cause memory leaks
    * because entries are never removed from the import cache.
    */
    const mtime = statSync(configPath).mtime.getTime();
    const fileURL = pathToFileURL(configPath);
    fileURL.searchParams.append('mtime', mtime.toFixed());
    const filePath = fileURL.toString();
    config = (await import(filePath)).default;
  }

  return Config.parse(config);
}