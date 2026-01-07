import axios, { isAxiosError, RawAxiosRequestHeaders } from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';

import { PAT } from './PAT';

export const uploadToUPM = async (baseUrl: string, path: string, username?: string, password?: string, pat: string = PAT.token, verbose = true): Promise<boolean> =>{
  // Get the UPM token, which is required for uploading a file
  const token = await getUPMToken(baseUrl, username, password, pat);

  // If the token is null, there is no point in continuing down this road
  if (token === null) {
    verbose && console.log('Failed to upload plugin archive file to UPM, unable to retrieve UPM token');
    return false;
  }

  // First upload the file using Basic Authentication, as this is the most common way
  const credentials = username && password ? Buffer.from(`${username}:${password}`).toString('base64') : null;
  return uploadFile(baseUrl, token, path, {
    ...credentials ? { 'Authorization': `Basic ${credentials}` } : undefined
  }).then(() => {
    verbose && console.log('Finished uploading plugin archive to UPM')
    return true;

  // If Basic Authentication does not work, it will throw an error (unauthenticated or bad request)
  }).catch(async (err) => {
    // Check if the upload failed because of authentication issues
    if (isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
      // If we caanot upload using Basic Authentication, use the "known" PAT token, which should be added to the database post-installation
      return uploadFile(baseUrl, token, path, {
        'Authorization': `Bearer ${pat}`
      }).then(() => {
        verbose && console.log('Finished uploading plugin archive to UPM')
        return true;
      });

    // If this is not an authentication issue, bubble the error to the calling function
    } else {
      throw err;
    }
  });
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
      if (isAxiosError(err)) {
        if (err.response?.data?.subCode === 'upm.plugin.error.plugin.not.using.licensing') {
          return true;
        }
      }

      verbose && console.log('Failed to upload license to UPM', err);
      return false;
    });
  }

  return true;
}

const getUPMToken = async (baseUrl: string, username?: string, password?: string, pat?: string, verbose?: boolean): Promise<string|null> => {
  const credentials = username && password ? Buffer.from(`${username}:${password}`).toString('base64') : null;

  const response = await axios.get(`${baseUrl}/rest/plugins/1.0/?os_authType=basic`, credentials ? {
    headers: { 'Authorization': `Basic ${credentials}` }
  } : undefined).catch(async (err) => {
    if (isAxiosError(err) && err.response?.status === 403) {
      const response = await axios.get(`${baseUrl}/rest/plugins/1.0/`, {
        headers: { 'Authorization': `Bearer ${pat}` }
      }).catch(err => {
        verbose && console.log('Failed to upload plugin archive file to UPM, unable to retrieve token', err);
        return null;
      });
      return response;
    }

    verbose && console.log('Failed to upload plugin archive file to UPM, unable to retrieve token', err);
    return null;
  });

  return response ? response.headers['upm-token'] : null;
}

const uploadFile = (baseUrl: string, token: string, filePath: string, headers: RawAxiosRequestHeaders) => {
  const formData = new FormData();
  formData.append('plugin', createReadStream(filePath));
  return axios.post(`${baseUrl}/rest/plugins/1.0/?token=${token}`, formData, { headers: {
    ...formData.getHeaders(),
    ...headers,
  }});
}