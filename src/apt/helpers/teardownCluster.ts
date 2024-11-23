import { TAPTTeardownOptions } from '../../types/DCAPT';
import { emptyLine, Teardown } from '../messages';
import { terminate } from './dcapt';
import { getAptDictory } from './getAptDirectory';
import { getAWSCredentials } from './getAWSCredentials';
import { persistAWSCredentials } from './persistsAWSCredentials';
import { waitForUserInput } from './waitForUserInput';

export const teardownCluster = async (options: TAPTTeardownOptions) => {
  // Show nice little welcome message
  console.log(Teardown.header);

  // Ask for the proper directory of APT
  const directory = await getAptDictory(options.cwd, true, options.force);

  // Ask for the AWS credentials
  const [ aws_access_key_id, aws_secret_access_key ] = await getAWSCredentials(options.product, options.force);

  // Write AWS credentials to disk
  persistAWSCredentials(directory, aws_access_key_id, aws_secret_access_key);

  // Ask the user if they are ready to say goodbye to their cluster
  await waitForUserInput('Press a key to continue...', options.force)
  emptyLine();

  // Terminate it!
  await terminate(directory, options.environment);

  // Ask the user to quit the program
  await waitForUserInput('Press a key to exit...', options.force);
}