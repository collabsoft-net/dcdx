import { readFileSync } from 'fs'

import { toAbsolutePath } from './toAbsolutePath'

export const getVersions = (): Record<string, Array<string>> => {
  const content = readFileSync(toAbsolutePath('../../assets/versions.json'), 'utf-8');
  const versions = JSON.parse(content);
  return versions;
}