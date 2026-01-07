import { input, password as passwordPrompt, select } from '@inquirer/prompts';
import { Presets, SingleBar } from 'cli-progress';
import { rmSync } from 'fs';

import { downloadFile } from '../apt/helpers/downloadFile';
import { getAppLicense } from '../apt/helpers/getAppLicense';
import { getUrlByAppKey } from '../apt/helpers/getUrlByAppKey';
import { TInstallFromMPACOptions } from '../types/Install';
import { registerLicense, uploadToUPM, waitForPluginToBeEnabled } from './upm';

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

export const installFromMPAC = async (options: TInstallFromMPACOptions) => {

  // Ask them nicely for the app key
  const addonKey = await input({
    message: 'Please provide the key of the app to be installed',
    default: options.appKey,
    required: true
  });

  // Ask them nicely for base URL of the instance
  const baseUrl = await input({
    message: 'Please provide the URL to the instance in which the app should be installed',
    default: options.baseUrl,
    required: true
  });

  // If there is no username or PAT, ask them nicely how they want to authenticate
  const authType: 'basic'|'pat' = options.username ? 'basic' : options.pat ? 'pat' : await select({
    message: `How do you wish to authenticate?`,
    default: 'basic',
    choices: [
      { name: 'Username/password', value: 'basic' },
      { name: 'Personal Access Token', value: 'pat' }
    ]
  });

  // Ask them nicely for the username
  const adminUsername = authType === 'basic' && !options.username ? await input({
    message: 'Please provide the username of a system administrator',
    required: true
  }) : options.username;

  // Ask them nicely for the username
  const adminPassword = authType === 'basic' && !options.password ? await passwordPrompt({
    message: 'Please provide the username of a system administrator',
    validate: item => typeof item === 'string' && item.length > 0
  }) : options.password;

  // Ask them nicely for the PAT
  const adminPAT = authType === 'pat' && !options.pat ? await passwordPrompt({
    message: 'Please provide the Personal Access Token of a system administrator',
    validate: item => typeof item === 'string' && item.length > 0
  }) : options.pat;

  // Ask them nicely for the app license to be used
  const appLicense = await getAppLicense(options.license, false);

  // Tell them we are starting
  console.log(`Installing the app using the Universal Plugin Manager REST API`);

  // Show a progress bar
  progressBar.start(180, 0)
  const timerId = setInterval(() => progressBar.increment(), 1000);

  // Get the download URL based on the appKey
  const url = await getUrlByAppKey(addonKey);

  // Download the file from MPAC
  const file = await downloadFile(url);

  // Upload it into the cluster using the UPM REST API
  const isInstalled = await uploadToUPM(baseUrl, file, adminUsername, adminPassword, adminPAT, false);
  if (!isInstalled) {
    throw new Error('Failed to install the app using the Universal Plugin Manager REST API');
  }

  // Wait for the plugin to be enabled
  const isEnabled = await waitForPluginToBeEnabled(addonKey, baseUrl, adminUsername, adminPassword, false);
  if (!isEnabled) {
    throw new Error('The app could not be enabled on the cluster, please refer to the application log files for more information');
  }

  // Register the provided license
  const isLicensed = await registerLicense(addonKey, appLicense, baseUrl, adminUsername, adminPassword, false);
  if (!isLicensed) {
    throw new Error('The license could not be applied for the app on the cluster, please refer to the application log files for more information');
  }

  // Remove the temporary file
  rmSync(file, { force: true });

  // Stop the progress bar
  progressBar.stop();
  clearInterval(timerId);

  // Tell them we succeeded
  console.log(`✔ Succesfully installed the app in your instance`);

}