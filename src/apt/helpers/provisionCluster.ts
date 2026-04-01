import { TAPTProvisionOptions } from '../../types/DCAPT';
import { install } from '../helpers/dcapt';
import { getAptDictory } from '../helpers/getAptDirectory';
import { getAWSCredentials } from '../helpers/getAWSCredentials';
import { getEnvironmentName } from '../helpers/getEnvironmentName';
import { getHostLicense } from '../helpers/getHostLicense';
import { persistClusterConfiguration } from '../helpers/persistClusterConfiguration';
import { persistAWSCredentials } from '../helpers/persistsAWSCredentials';
import { waitForUserInput } from '../helpers/waitForUserInput';
import { emptyLine, provisioning } from '../messages';
import { getClusterURL } from './getClusterURL';

export const provisionCluster = async (options: TAPTProvisionOptions, mustUseDefaultConfiguration: boolean) => {
  // Show the provisioning welcome message
  console.log(provisioning.header);

  // Ask for the proper directory of APT
  const directory = await getAptDictory(options.cwd, mustUseDefaultConfiguration, options.force);

  // Ask for the AWS credentials
  const [ aws_access_key_id, aws_secret_access_key ] = await getAWSCredentials(options.product, options.force);

  // Ask for the environment name
  const environment = options.environment || await getEnvironmentName();

  // Ask for the license
  const license = await getHostLicense(options.product, options.license, options.force);

  // Get the number of nodes (or default to one)
  const nodes = options.nodes || 1;

  // Let's do this
  console.log(provisioning.ready);
  await waitForUserInput('Press a key to start provisiong the AWS environment...', options.force);
  emptyLine();

  // Write AWS credentials to disk
  persistAWSCredentials(directory, aws_access_key_id, aws_secret_access_key);

  // Write Terraform variables to disk
  persistClusterConfiguration({
    product: options.product,
    tag: options.tag,
    cwd: directory,
    environment,
    monitoring: options.monitoring,
    license,
    nodes
  });

  // Run the DCAPT install script
  await install(directory);

  // Get the cluster URL from the outputs.json
  const baseUrl = await getClusterURL(directory, options.product);

  // Return all the questions we asked the user for use in other steps
  return {
    cwd: directory,
    environment,
    aws_access_key_id,
    aws_secret_access_key,
    baseUrl,
    license
  }
}