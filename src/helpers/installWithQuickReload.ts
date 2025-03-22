
import { TInstallWithQuickReloadOptions } from '../types/Install';
import * as Docker from './docker';

export const installWithQuickReload = async (options: TInstallWithQuickReloadOptions) => {
  const containerIds = await Docker.getRunningContainerIds(options.product);
  if (!containerIds || containerIds.length <= 0) {
    console.log(`There are no running instance of ${options.product}, unable to install plugin 🤔`);
    return;
  } else if (containerIds.length > 1) {
    console.log(`There are multple running instance of ${options.product}, unable to determine which one to use 🤔`);
    return;
  }

  const containerId = containerIds[0];
  if (containerId) {
    console.log(`Found updated plugin, uploading it to QuickReload on running instances of ${options.product}`);
    await Docker.copy(options.path, `${containerId}:/opt/quickreload/`)
      .then(() => console.log('Finished uploading plugin archive to QuickReload'))
      .catch(err => console.log('Failed to upload plugin archive file to QuickReload', err));
  }
}