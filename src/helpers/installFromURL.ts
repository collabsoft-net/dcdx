import { input, password as passwordPrompt } from '@inquirer/prompts';
import { Presets, SingleBar } from 'cli-progress';
import { existsSync, rmSync } from 'fs';

import { downloadFile } from '../apt/helpers/downloadFile';
import { getAppLicense } from '../apt/helpers/getAppLicense';
import { TInstallFromURLOptions } from '../types/Install';
import { registerLicense, uploadToUPM, waitForPluginToBeEnabled } from './upm';
import { validateAtlassianPlugin } from './validateAtlassianPlugin';

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

export const installFromURL = async (options: TInstallFromURLOptions) => {

  // Ask them nicely for the url or path
  const path = !options.path ? await input({
    message: 'Please provide the URL or path to the app to be installed',
    required: true
  }) : options.path;

  // Ask them nicely for base URL of the instance
  const baseUrl = !options.baseUrl ? await input({
    message: 'Please provide the URL to the instance in which the app should be installed',
    required: true
  }) : options.baseUrl;

  // Ask them nicely for the username
  const adminUsername = !options.username ? await input({
    message: 'Please provide the username of a system administrator',
    required: true
  }) : options.username;

  // Ask them nicely for the username
  const adminPassword = !options.password ? await passwordPrompt({
    message: 'Please provide the username of a system administrator',
    validate: item => typeof item === 'string' && item.length > 0
  }) : options.password;

  // Ask them nicely for the app license to be used
  const appLicense = await getAppLicense(options.license, options.license !== undefined);

  // Tell them we are starting
  console.log(`Installing the app using the Universal Plugin Manager REST API`);

  let timerId;

  if (!options.verbose) {
    // Show a progress bar
    progressBar.start(180, 0)
    timerId = setInterval(() => progressBar.increment(), 1000);
  }

  // Check if we are dealing with a URL
  const isUrl = URL.canParse(path);

  // If this is not a URL and the file does not exist, throw an error
  if (!isUrl && !existsSync(path)) {
    throw new Error(`Could not find the app in the specified location ${path}`);
  }

  // Download the file from MPAC
  const file = isUrl ? await downloadFile(path) : path;

  // Check if this is a valid Atlassian Plugin JAR
  const { appKey } = await validateAtlassianPlugin(file, options.verbose);

  // Upload it into the cluster using the UPM REST API
  const isInstalled = await uploadToUPM(baseUrl, file, adminUsername, adminPassword, options.verbose);
  if (!isInstalled) {
    throw new Error('Failed to install the app using the Universal Plugin Manager REST API');
  }

  // Wait for the plugin to be enabled
  const isEnabled = await waitForPluginToBeEnabled(appKey, baseUrl, adminUsername, adminPassword, options.verbose);
  if (!isEnabled) {
    throw new Error('The app could not be enabled on the cluster, please refer to the application log files for more information');
  }

  // Register the provided license
  const isLicensed = await registerLicense(appKey, appLicense, baseUrl, adminUsername, adminPassword, options.verbose);
  if (!isLicensed) {
    throw new Error('The license could not be applied for the app on the cluster, please refer to the application log files for more information');
  }

  if (!options.verbose) {
    // Stop the progress bar
    progressBar.stop();
    clearInterval(timerId);
  }

  // Remove the temporary file if we downloaded it
  if (isUrl) {
    rmSync(file, { force: true });
  }

  // Tell them we succeeded
  console.log(`✔ Succesfully installed the app in your instance`);

}