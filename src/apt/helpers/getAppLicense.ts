import { input } from '@inquirer/prompts';
import { existsSync, readFileSync } from 'fs';

import { app3hour } from '../../helpers/licences'
import { provisioning } from '../messages';


export const getAppLicense = (license?: string, force?: boolean) => {

  const appLicense = license && existsSync(license) ? readFileSync(license, 'utf8') : license;

  if (force) {
    return appLicense || app3hour;
  }

  console.log(provisioning.askForAppLicense);

  return input({
    message: `License`,
    default: appLicense || app3hour,
    required: true
  });
}