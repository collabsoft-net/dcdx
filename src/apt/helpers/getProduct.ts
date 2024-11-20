import { select } from '@inquirer/prompts';

import { TSupportedApplications } from '../../types/Application';

export const getProduct = async (): Promise<TSupportedApplications> => {
  return select<TSupportedApplications>({
    message: `Please choose the product for which you wish to run DCAPT`,
    choices: [
      { name: 'Jira', value: 'jira' },
      { name: 'Confluence', value: 'confluence' },
      { name: 'Bamboo', value: 'bamboo' },
      { name: 'Bitbucket', value: 'bitbucket' }
    ]
  });
}