
import axios from 'axios';
import console from 'console';
import { writeFileSync } from 'fs';
import { setTimeout } from 'timers';

const repositories = [
  { name: 'jira', repository: 'atlassian/jira-software' },
  { name: 'confluence', repository: 'atlassian/confluence' },
  { name: 'bamboo', repository: 'atlassian/bamboo-server' },
  { name: 'bitbucket', repository: 'atlassian/bitbucket-server' },
  { name: 'mysql', repository: 'library/mysql' },
  { name: 'postgresql', repository: 'library/postgres' },
];

const getListOfTagsPaginated = async (url) => {
  const tags = [];
  const { data } = await axios.get(url);
  if (data) {
    tags.push(...data.results.map(item => item.name));

    if (data.next) {
      // Add a backoff period to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      tags.push(...await getListOfTagsPaginated(data.next));
    }
  }

  return tags;
}

(async () => {
  const result = await repositories.reduce(async (previous, item) => {
    const result = await previous;
    console.log(`Retrieving list of tags for ${item.name}...`);
    const tags = await getListOfTagsPaginated(`https://hub.docker.com/v2/repositories/${item.repository}/tags/?page_size=100`);
    result[item.name] = tags;
    return result;
  }, Promise.resolve({}));

  // Microsft SQL Server has it's own registry with a different API
  console.log(`Retrieving list of tags for mssql...`);
  const { data } = await axios.get('https://mcr.microsoft.com/v2/mssql/server/tags/list');
  result['mssql'] = data.tags;

  const output = {};
  Object.entries(result).forEach(([ key, value ]) => output[key] = value);
  writeFileSync('assets/versions.json', JSON.stringify(output));
})();