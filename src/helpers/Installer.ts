import { resolve as resolvePath } from 'path';
import { cwd } from 'process';

import { TSupportedApplications } from '../types/Application';
import { TInstallerOptions } from '../types/Installer';
import * as Docker from './docker';
import { uploadToUPM } from './upm';

export const Installer = async (name: TSupportedApplications, path: string, options: TInstallerOptions) => {
  const containerIds = await Docker.getRunningContainerIds(name);
  if (!containerIds || containerIds.length <= 0) {
    console.log(`There are no running instance of ${name}, unable to install plugin 🤔`);
    return;
  } else if (containerIds.length > 1) {
    console.log(`There are multple running instance of ${name}, unable to determine which one to use 🤔`);
    return;
  }

  const containerId = containerIds[0];
  if (containerId) {
    if (options.obr) {
      console.log(`Found updated plugin, uploading it to UPM on running instances of ${name}`);
      const hostUrl = options.port ? `localhost:${options.port}` : `localhost`;
      const baseUrl = options.username && options.password ? `http://${options.username}:${options.password}@${hostUrl}` : `http://${hostUrl}`;
      await uploadToUPM(resolvePath(options.cwd || cwd(), path), baseUrl).catch(err => {
        console.log('Failed to upload plugin archive file to UPM', err);
      });
    } else {
      console.log(`Found updated plugin, uploading it to QuickReload on running instances of ${name}`);
      await Docker.copy(resolvePath(options.cwd || cwd(), path), `${containerId}:/opt/quickreload/`)
        .then(() => console.log('Finished uploading plugin archive to QuickReload'))
        .catch(err => console.log('Failed to upload plugin archive file to QuickReload', err));
    }
  }
}