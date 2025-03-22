
import axios from 'axios';
import console from 'console';
import { writeFileSync } from 'fs';
import semver from 'semver';

// import { setTimeout } from 'timers';
import { TSupportedApplications } from '../types/Application';
import { TSupportedDatabaseEngines } from '../types/Database';
import { getVersions } from './getVersions';
import { toAbsolutePath } from './toAbsolutePath';

const repositories = [
  { name: 'jira', repository: 'atlassian/jira-software' },
  { name: 'confluence', repository: 'atlassian/confluence' },
  { name: 'bamboo', repository: 'atlassian/bamboo' },
  { name: 'bitbucket', repository: 'atlassian/bitbucket' },
  { name: 'mysql', repository: 'library/mysql' },
  { name: 'postgresql', repository: 'library/postgres' },
];

const getListOfTagsPaginated = async (url: string): Promise<Array<string>> => {
  const tags: Array<string> = [];
  const { data } = await axios.get(url);
  if (data) {
    tags.push(...data.results.map((item: { name: string }) => item.name));

    if (data.next) {
      // Add a backoff period to avoid rate limiting
      // await new Promise(resolve => setTimeout(resolve, 100));
      tags.push(...await getListOfTagsPaginated(data.next));
    }
  }

  return tags;
}

const sortByVersion = (a: string, b: string): number => {
  a = a.split('-')[0];
  b = b.split('-')[0];

  if (isNaN(Number(a.charAt(0)))) {
    return -1;
  }

  if (isNaN(Number(b.charAt(0)))) {
    return 1;
  }

  if (a.split('.').length === 0) {
    a = `${a}.0.0`;
  } else if (a.split('.').length === 1) {
    a = `${a}.0`;
  }

  if (b.split('.').length === 0) {
    b = `${a}.0.0`;
  } else if (a.split('.').length === 1) {
    b = `${a}.0`;
  }

  const leftVersion = semver.coerce(a);
  const rightVersion = semver.coerce(b);

  if (!leftVersion) return 1;
  if (!rightVersion) return 0;

  return semver.lt(leftVersion, rightVersion) ? -1 : semver.gt(leftVersion, rightVersion) ? 1 : 0;
}

export const generateVersionList = async (repository?: TSupportedApplications|TSupportedDatabaseEngines) => {
  const versions = getVersions();
  const result: Record<string, Array<string>> = {};

  for await (const item of repositories) {
    if (repository && item.name !== repository) {
      continue;
    }

    console.log(`Retrieving list of tags for ${item.name}...`);
    const tags = await getListOfTagsPaginated(`https://hub.docker.com/v2/repositories/${item.repository}/tags/?page_size=100`);
    result[item.name] = tags.sort(sortByVersion);
  }

  // Microsft SQL Server has it's own registry with a different API
  if (!repository || repository === 'mssql') {
    console.log(`Retrieving list of tags for mssql...`);
    const { data } = await axios.get('https://mcr.microsoft.com/v2/mssql/server/tags/list');
    result['mssql'] = data.tags.sort(sortByVersion);
  }

  Object.entries(result).forEach(([ key, value ]) => versions[key] = value);
  writeFileSync(toAbsolutePath('../../assets/versions.json'), JSON.stringify(versions, null, 2));
  return versions;
};