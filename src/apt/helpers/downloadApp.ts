import axios from 'axios';
import { parse } from 'content-disposition';
import { createWriteStream, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { finished } from 'stream/promises';

export const downloadApp = async (addonKey: string) => {
  const tmpDir = join(homedir(), '.dcdx', 'tmp');
  mkdirSync(tmpDir, { recursive: true });

  let downloadUrl = `https://marketplace.atlassian.com/download/plugins/${addonKey}`;
  const { data: listing } = await axios.get(`https://marketplace.atlassian.com/rest/2/addons/${addonKey}?hosting=datacenter&withVersion=true`).catch(() => ({ data: null }));
  if (listing) {
    downloadUrl = listing._embedded?.version?._embedded?.artifact?._links?.binary?.href || downloadUrl;
  }

  const response = await axios({
    method: 'get',
    url: downloadUrl,
    responseType: 'stream'
  });

  const disposition = parse(response.headers['content-disposition']);
  const filename = disposition?.parameters?.filename || addonKey;
  const tmpFile = join(tmpDir, filename);
  const writer = createWriteStream(tmpFile);

  response.data.pipe(writer)
  await finished(writer);

  return tmpFile;
}