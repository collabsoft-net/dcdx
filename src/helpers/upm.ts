import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';

export const uploadToUPM = async (baseUrl: string, path: string, username?: string, password?: string, verbose = true): Promise<boolean> =>{
  const credentials = username && password ? Buffer.from(`${username}:${password}`).toString('base64') : null;
  const response = await axios.get(`${baseUrl}/rest/plugins/1.0/?os_authType=basic`, credentials ? {
    headers: { 'Authorization': `Basic ${credentials}` }
  } : undefined).catch(err => {
    verbose && console.log('Failed to upload plugin archive file to UPM, unable to retrieve token', err);
    return null;
  });

  if (response) {
    const token = response.headers['upm-token'];
    if (token) {
      const formData = new FormData();
      formData.append('plugin', createReadStream(path));
      return axios.post(`${baseUrl}/rest/plugins/1.0/?token=${token}`, formData, { headers: {
        ...formData.getHeaders(),
        ...credentials ? { 'Authorization': `Basic ${credentials}`} : {}
      }}).then(() => {
        verbose && console.log('Finished uploading plugin archive to UPM')
        return true;
      });
    } else {
      verbose && console.log('Failed to upload plugin archive file to UPM, unable to retrieve token from headers:', JSON.stringify(response.headers, null, 2));
      return false;
    }
  }

  return false;
}

export const waitForPluginToBeEnabled = async (appKey: string, baseUrl: string, username?: string, password?: string, verbose = true) => {
  const credentials = username && password ? Buffer.from(`${username}:${password}`).toString('base64') : null;

  verbose && console.log('Waiting for plugin to become enabled')
  let isEnabled = false;
  let count = 0;
  while (!isEnabled && count < 120) {
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
    verbose && console.log(`Waiting for plugin to become enabled... ${count}s`);
    const { data } = await axios.get(`${baseUrl}/rest/plugins/1.0/${appKey}-key`, credentials ? {
        headers: { 'Authorization': `Basic ${credentials}` }
      } : undefined
    ).catch(() => ({ data: { enabled: false } }));
    isEnabled = data?.enabled;
    count++;
  }
  return isEnabled;
}

export const registerLicense = async (appKey: string, license: string, baseUrl: string, username?: string, password?: string, verbose = true): Promise<boolean> => {
  const credentials = username && password ? Buffer.from(`${username}:${password}`).toString('base64') : null;

  const { data } = await axios.get(`${baseUrl}/rest/plugins/1.0/${appKey}-key/license`, {
    headers: {
      'X-Atlassian-Token': 'no-check',
      'Content-Type': 'application/vnd.atl.plugins+json',
      ...credentials ? { 'Authorization': `Basic ${credentials}` } : {}
    }
  }).catch(() => ({ data: {} }));

  const { rawLicense } = data;
  if (!rawLicense || rawLicense !== license) {
    return axios.put(
      `${baseUrl}/rest/plugins/1.0/${appKey}-key/license`,
      `{ "rawLicense": "${license}" }`,
      {
        headers: {
          'X-Atlassian-Token': 'no-check',
          'Content-Type': 'application/vnd.atl.plugins+json',
          ...credentials ? { 'Authorization': `Basic ${credentials}` } : {}
        }
      }
    ).then(() => {
      verbose && console.log('Finished uploading license to UPM');
      return true;
    }).catch(err => {
      verbose && console.log('Failed to upload license to UPM', err);
      return false;
    });
  }

  return true;
}