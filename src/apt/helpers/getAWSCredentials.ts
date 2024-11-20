import { password } from '@inquirer/prompts';

import { TSupportedApplications } from '../../types/Application';
import { provisioning } from '../messages';


export const getAWSCredentials = async (product: TSupportedApplications, force?: boolean): Promise<[ string, string ]> => {

  // Try getting the AWS credentials from environment variables
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;

  // If they exists as environment variables, return them immediately
  if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    return [ AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY ];
  }

  // If we are not in non-interactive mode, we should ask for them
  if (!force) {

    // Show a message asking nicely
    console.log(provisioning.askForAWSCredentials(product));

    const aws_access_key_id = await password({
      message: `AWS Access Key ID`,
      validate: (input) => typeof input === 'string' && input.length > 0
    });

    const aws_secret_access_key = await password({
      message: `AWS Secret Access Key`,
      validate: (input) => typeof input === 'string' && input.length > 0
    });

    return [ aws_access_key_id, aws_secret_access_key];
  }

  // If we are in non-interactive mode, and the credentials have not been found, we should throw an error
  throw new Error(`The AWS credentials could not be found. Please provide the 'AWS_ACCESS_KEY_ID' and 'AWS_SECRET_ACCESS_KEY' environment variables`);
}