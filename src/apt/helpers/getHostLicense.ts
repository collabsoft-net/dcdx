import { input } from '@inquirer/prompts';
import { existsSync, readFileSync } from 'fs';

import { timebomb } from '../../helpers/licences'
import { TSupportedApplications } from '../../types/Application'
import { provisioning } from '../messages';


export const getHostLicense = (product: TSupportedApplications, license?: string, force?: boolean) => {

  const productLicense = license && existsSync(license) ? readFileSync(license, 'utf8') : license;

  if (force) {
    return productLicense || timebomb[product];
  }

  console.log(provisioning.askForLicense);

  return input({
    message: `License`,
    default: productLicense || timebomb[product],
    required: true
  });
}