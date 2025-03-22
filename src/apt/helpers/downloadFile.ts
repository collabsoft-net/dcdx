import axios from 'axios';
import { parse } from 'content-disposition';
import { createWriteStream, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { finished } from 'stream/promises';

export const downloadFile = async (url: string, name?: string) => {
  // Placeholder for temporary location to where the file is downloaded
  const tmpDir = join(homedir(), '.dcdx', 'tmp');

  // Make sure the temporary folder exists
  mkdirSync(tmpDir, { recursive: true });

  // Initiate the download
  const response = await axios({
    url,
    method: 'get',
    responseType: 'stream'
  });

  const URI = new URL(url);
  const lastPathSegment = URI.pathname.split('/').pop();
  name = name || (lastPathSegment?.toLowerCase().endsWith('.jar') || lastPathSegment?.toLowerCase().endsWith('.obr'))
    ? lastPathSegment
    : undefined;

  // Try to find the filename from the headers or the alternative name (if provided)
  const disposition = response.headers['content-disposition'] ? parse(response.headers['content-disposition']) : undefined;
  const filename = disposition?.parameters?.filename || name;
  if (!filename) {
    throw new Error('Could not determine the filename based on the URL, and no alternative name was provided');
  }

  // Placeholder for temporary file download location
  const tmpFile = join(tmpDir, filename);

  // Create the write stream to the temporary file location
  const writer = createWriteStream(tmpFile);

  // Get the data from the download and write it to the temporary file
  response.data.pipe(writer)

  // Wait for the download to finish completely
  await finished(writer);

  // Return the location to the downloaded file
  return tmpFile;
}