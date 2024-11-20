import { input } from '@inquirer/prompts';

import { timebomb } from '../../helpers/licences'
import { TSupportedApplications } from '../../types/Application'
import { provisioning } from '../messages';


export const getHostLicense = (product: TSupportedApplications, force?: boolean) => {
  if (force) {
    return timebomb[product];
  }

  console.log(provisioning.askForLicense);

  return input({
    message: `License`,
    default: timebomb[product],
    required: true
  });
}