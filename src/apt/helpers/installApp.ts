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
  format: '  [{bar}] {percentage}% | ETA: {remaining}m',
  hideCursor: true
}, Presets.legacy);

const round = (value: number, step: number) => {
  step || (step = 1.0);
  const inv = 1.0 / step;
  return Math.round(value * inv) / inv;
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

    console.log(`
  Installing the app (${appKey}) into the cluster using the Universal Plugin Manager REST API`);

    // Show a progress bar
    progressBar.start(300, 0, { remaining: 5 })
    const timerId = setInterval(() => {
      if (progressBar.getProgress() >= 300) {
        throw new Error('Failed to install app into the cluster using the Universal Plugin Manager REST API');
      }
      progressBar.increment(1, { remaining: round((progressBar.getTotal() - progressBar.getProgress()) / 60, 0.5) });
    }, 1000);

    // Download the file from MPAC
    const file = await download(appKey);

    // Upload it into the cluster using the UPM REST API
    await uploadToUPM(baseUrl, file, 'admin', 'admin', false);

    // Wait for the plugin to be enabled
    await waitForPluginToBeEnabled(appKey, baseUrl, 'admin', 'admin', false);

    // Register the license (use the 3 hour timebomb in non-interactive mode)
    await registerLicense(appKey, license, baseUrl, 'admin', 'admin', false);

    // Remove the temporary file
    rmSync(file, { force: true });

    // Stop the progress bar
    progressBar.stop();
    clearInterval(timerId);

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
      progressBar.start(300, 0, { remaining: 5 })
      const timerId = setInterval(() => {
        if (progressBar.getProgress() >= 300) {
          throw new Error('Failed to install app into the cluster using the Universal Plugin Manager REST API');
        }
        progressBar.increment(1, { remaining: round((progressBar.getTotal() - progressBar.getProgress()) / 60, 0.5) });
      }, 1000);

      // Download the file from MPAC
      const file = await download(addonKey);

      // Upload it into the cluster using the UPM REST API
      await uploadToUPM(baseUrl, file, 'admin', 'admin', false);

      // Wait for the plugin to be enabled
      await waitForPluginToBeEnabled(addonKey, baseUrl, 'admin', 'admin', false);

      // Register the provided license
      await registerLicense(addonKey, appLicense, baseUrl, 'admin', 'admin', false);

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