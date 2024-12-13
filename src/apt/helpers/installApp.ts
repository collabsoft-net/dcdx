import { confirm, input, password as passwordPrompt,select } from '@inquirer/prompts';
import axios from 'axios';
import { Presets, SingleBar } from 'cli-progress';
import { parse } from 'content-disposition';
import { createWriteStream, mkdirSync, rmSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { registerLicense, uploadToUPM, waitForPluginToBeEnabled } from '../../helpers/upm';
import { TInstallOptions } from '../../types/Install';
import { getAppLicense } from './getAppLicense';
import { getAptDictory } from './getAptDirectory';
import { getAWSCredentials } from './getAWSCredentials';
import { getEnvironmentName } from './getEnvironmentName';
import { getProduct } from './getProduct';
import { restartCluster } from './restartCluster';

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

  let downloadUrl = `https://marketplace.atlassian.com/download/plugins/${addonKey}`;
  const { data: listing } = await axios.get(`https://marketplace.atlassian.com/rest/2/addons/${addonKey}?hosting=datacenter&withVersion=true`).catch(() => ({ data: null }));
  if (listing) {
    downloadUrl = listing._embedded?.version?._embedded?.artifact?._links?.binary?.href || downloadUrl;
  }

  await axios({
    method: 'get',
    url: downloadUrl,
    responseType: 'stream'
  }).then(response => {
    const disposition = parse(response.headers['content-disposition']);
    const filename = disposition?.parameters?.filename || addonKey;
    tmpFile = filename;

    response.data.pipe(createWriteStream(tmpFile));
  }).catch(() => null);

  return tmpFile;
}

export const installApp = async (options: TInstallOptions) => {

  // Set default value for username/password
  const username = options.username || 'admin';
  const password = options.password || 'admin';

  // If we are in non-interactive mode, we will download it from MPAC
  if (options.force) {

    // In order to do so, we need an appkey. If this is not provided, throw a hissy fit
    if (!options.appKey) {
      throw new Error('Failed to automatically install app into cluster, `appKey` was not provided');
    }

    // Get the app license
    const appLicense = await getAppLicense(options.license, options.force);

    // Download the file from MPAC
    const file = await download(options.appKey);

    let count = 0;
    let timerId = null;
    let isInstalledSuccesfully = false;

    while (!isInstalledSuccesfully && count <= 4) {
      try {

        if (count === 0) {
          console.log(`
  Installing the app (${options.appKey}) into the cluster using the Universal Plugin Manager REST API`);
        } else {
          console.log(`
  Retrying installation of the app (${options.appKey}) into the cluster using the Universal Plugin Manager REST API (attempt ${count + 1})`);
        }

        // Show a progress bar
        progressBar.start(180, 0)
        timerId = setInterval(() => progressBar.increment(), 1000);

        // Upload it into the cluster using the UPM REST API
        const isInstalled = await uploadToUPM(options.baseUrl, file, username, password, false);
        if (!isInstalled) {
          throw new Error('Failed to install app into the cluster using the Universal Plugin Manager REST API');
        }

        // Check if we need to restart the application container
        if (options.restartAfterInstall) {

          // For restarts, the product option is required
          if (!options.product) {
            console.log('  Failed to restart application, required option `product` is missing');

          // For restarts, the environment option is required
          } else if (!options.environment) {
            console.log('  Failed to restart application, required option `product` is missing');

          // Ok, good to go!
          } else {
            // Oh right, we also need DCAPT in order to be able to restart the cluster
            const cwd = await getAptDictory(options.cwd, false, options.force);

            // We are now going to restart the cluster and hope for the best
            console.log(`  Restarting ${options.product} to ensure app installation`);
            await restartCluster({
              cwd,
              product: options.product,
              environment: options.environment,
              aws_access_key_id: options.aws_access_key_id,
              aws_secret_access_key: options.aws_secret_access_key,
              force: options.force
            });
          }
        }

        // Wait for the plugin to be enabled
        const isEnabled = await waitForPluginToBeEnabled(options.appKey, options.baseUrl, username, password, false);
        if (!isEnabled) {
          throw new Error('The app could not be enabled on the cluster, please refer to the application log files for more information');
        }

        // Register the license (use the 3 hour timebomb in non-interactive mode)
        const isLicensed = await registerLicense(options.appKey, appLicense, options.baseUrl, username, password, false);
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
    console.log(`✔ Finished installing the app (${options.appKey})`);

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
        default: options.appKey,
        required: true
      });

      // Ask them nicely for the app license to be used
      const appLicense = await getAppLicense(options.license, options.force);

      // Ask them nicely for the username
      const adminUsername = await input({
        message: 'Please provide the username of a system administrator',
        default: username,
        required: true
      });

      // Ask them nicely for the username
      const adminPassword = await passwordPrompt({
        message: 'Please provide the username of a system administrator',
        validate: item => typeof item === 'string' && item.length > 0
      });

      // Ask them nicely if we need to restart the application
      const restartAfterInstall = await confirm({
        message: 'Restart the host application after installation?',
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
      const isInstalled = await uploadToUPM(options.baseUrl, file, adminUsername, adminPassword, false);
      if (!isInstalled) {
        throw new Error('Failed to install app into the cluster using the Universal Plugin Manager REST API');
      }

      // Check if we need to restart the application container
      if (restartAfterInstall) {

        // Ask them nicely for the host product
        const product = options.product || await getProduct();

        // Ask for the AWS credentials
        const [ aws_access_key_id, aws_secret_access_key ] = await getAWSCredentials(product, options.force);

        // Ask for the environment name
        const environment = options.environment || await getEnvironmentName();

        // Oh right, we also need DCAPT in order to be able to restart the cluster
        const cwd = await getAptDictory(options.cwd, false, options.force);

        // We are now going to restart the cluster and hope for the best
        console.log(`  Restarting ${options.product} to ensure app installation`);
        await restartCluster({
          cwd,
          product: product,
          environment: environment,
          aws_access_key_id: aws_access_key_id,
          aws_secret_access_key: aws_secret_access_key,
          force: options.force
        });
      }

      // Wait for the plugin to be enabled
      const isEnabled = await waitForPluginToBeEnabled(addonKey, options.baseUrl, adminUsername, adminPassword, false);
      if (!isEnabled) {
        throw new Error('The app could not be enabled on the cluster, please refer to the application log files for more information');
      }

      // Register the provided license
      const isLicensed = await registerLicense(addonKey, appLicense, options.baseUrl, adminUsername, adminPassword, false);
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
  Please go to the following page:
    
  ${options.baseUrl}/plugins/servlet/upm?source=side_nav_manage_addons
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