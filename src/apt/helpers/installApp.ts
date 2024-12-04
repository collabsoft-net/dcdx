import { confirm, input, select } from '@inquirer/prompts';
import axios from 'axios';
import { Presets, SingleBar } from 'cli-progress';
import { parse } from 'content-disposition';
import { createWriteStream, mkdirSync, rmSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { app3hour } from '../../helpers/licences';
import { registerLicense, uploadToUPM, waitForPluginToBeEnabled } from '../../helpers/upm';

const progressBar = new SingleBar({
  format: '  [{bar}] {percentage}% | ETA: {eta_formatted}m',
  formatTime: (value) => {
    const total: number = progressBar.getTotal() / 60;
    const timePassed = round((progressBar.getTotal() - value) / 60, 0.5);
    return timePassed === total ? `${total}` : `${total - timePassed}`;
  },
  hideCursor: true
}, Presets.legacy);

const round = (value: number, step: number = 1.0) => {
  const inv = 1.0 / step;
  return Math.floor(value * inv) / inv;
}

const download = async (addonKey: string) => {
  const tmpDir = join(homedir(), '.dcdx', 'tmp');
  let tmpFile = join(tmpDir, addonKey);
  mkdirSync(tmpDir, { recursive: true });

  await axios({
    method: 'get',
    url: `https://marketplace.atlassian.com/download/plugins/${addonKey}`,
    responseType: 'stream'
  }).then(response => {
    const disposition = parse(response.headers['content-disposition']);
    const filename = disposition?.parameters?.filename || addonKey;
    tmpFile = filename;

    response.data.pipe(createWriteStream(tmpFile));
  }).catch(() => null);

  return tmpFile;
}

export const installApp = async (baseUrl: string, appKey?: string, license: string = app3hour, force?: boolean) => {

  // If we are in non-interactive mode, we will download it from MPAC
  if (force) {

    // In order to do so, we need an appkey. If this is not provided, throw a hissy fit
    if (!appKey) {
      throw new Error('Failed to automatically install app into cluster, `appKey` was not provided');
    }

    // Download the file from MPAC
    const file = await download(appKey);

    let count = 0;
    let timerId = null;
    let isInstalledSuccesfully = false;

    while (!isInstalledSuccesfully && count <= 4) {
      try {

        if (count === 0) {
          console.log(`
  Installing the app (${appKey}) into the cluster using the Universal Plugin Manager REST API`);
        } else {
          console.log(`
  Retrying installation of the app (${appKey}) into the cluster using the Universal Plugin Manager REST API (attempt ${count + 1})`);
        }

        // Show a progress bar
        progressBar.start(180, 0)
        timerId = setInterval(() => progressBar.increment(), 1000);

        // Upload it into the cluster using the UPM REST API
        const isInstalled = await uploadToUPM(baseUrl, file, 'admin', 'admin', false);
        if (!isInstalled) {
          throw new Error('Failed to install app into the cluster using the Universal Plugin Manager REST API');
        }

        // Wait for the plugin to be enabled
        const isEnabled = await waitForPluginToBeEnabled(appKey, baseUrl, 'admin', 'admin', false);
        if (!isEnabled) {
          throw new Error('The app could not be enabled on the cluster, please refer to the application log files for more information');
        }

        // Register the license (use the 3 hour timebomb in non-interactive mode)
        const isLicensed = await registerLicense(appKey, license, baseUrl, 'admin', 'admin', false);
        if (!isLicensed) {
          throw new Error('The license could not be applied for the app on the cluster, please refer to the application log files for more information');
        }

        isInstalledSuccesfully = isInstalled && isEnabled && isLicensed;
      } catch (err) {
        if (count <= 3) {
          // Wait a minute (cooldown period) before retrying
          await new Promise<void>(resolve => setTimeout(resolve, 1000));
        } else {
          throw err;
        }
      } finally {
        count++;

        // Stop the progress bar
        progressBar.stop();
        if (timerId) {
          clearInterval(timerId);
        }
      }
    }

    // Remove the temporary file
    rmSync(file, { force: true });

    // Tell them we succeeded
    console.log(`✔ Finished installing the app (${appKey})`);

  // If we're in interactive mode, let's be nice
  } else {

    // Tell the user they have options
    console.log(`
  It is now required to install the app into the Jira cluster.
  We can install it from the Atlassian Marketplace or you can install it manually.
`);

    // Ask them if they prefer automation or tedious manual tasks
    const method = await select({
      message: `How do you want to install the app?`,
      default: 'mpac',
      choices: [
        { name: 'Marketplace', value: 'mpac' },
        { name: 'Manual', value: 'manual' }
      ]
    });

    // If they chose automation, let's automate!
    if (method === 'mpac') {

      // Ask them nicely for the app key
      const addonKey = await input({
        message: 'Please provide the key of the app to be installed',
        default: appKey,
        required: true
      });

      // Ask them nicely for the app license to be used
      const appLicense = await input({
        message: `License`,
        default: license,
        required: true
      });

      // Tell them we are starting
      console.log(`
  Installing the app (${addonKey}) into the cluster using the Universal Plugin Manager REST API`);

      // Show a progress bar
      progressBar.start(180, 0)
      const timerId = setInterval(() => progressBar.increment(), 1000);

      // Download the file from MPAC
      const file = await download(addonKey);

      // Upload it into the cluster using the UPM REST API
      const isInstalled = await uploadToUPM(baseUrl, file, 'admin', 'admin', false);
      if (!isInstalled) {
        throw new Error('Failed to install app into the cluster using the Universal Plugin Manager REST API');
      }

      // Wait for the plugin to be enabled
      const isEnabled = await waitForPluginToBeEnabled(addonKey, baseUrl, 'admin', 'admin', false);
      if (!isEnabled) {
        throw new Error('The app could not be enabled on the cluster, please refer to the application log files for more information');
      }

      // Register the provided license
      const isLicensed = await registerLicense(addonKey, appLicense, baseUrl, 'admin', 'admin', false);
      if (!isLicensed) {
        throw new Error('The license could not be applied for the app on the cluster, please refer to the application log files for more information');
      }

      // Remove the temporary file
      rmSync(file, { force: true });

      // Stop the progress bar
      progressBar.stop();
      clearInterval(timerId);

      // Tell them we succeeded
      console.log(`✔ Finished installing the app (${addonKey})`);

    // They chose violence
    } else {

      // Rub it in their face
      console.log(`
  You can now install the app manually into the cluster.
  Please go to the following page (login with 'admin'/'admin'):
    
  ${baseUrl}/plugins/servlet/upm?source=side_nav_manage_addons
`);

      // Make them grovel
      const isInstalledManually = await confirm({
        message: `Please confirm that you have installed the app manually`
      });

      // If the app ain't installed, we ain't doing nothin'. So we better throw a hissy fit
      if (!isInstalledManually) {
        throw new Error('It is required to install the app to run the second performance regression test');
      }

    }
  }
}