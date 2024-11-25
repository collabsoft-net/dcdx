import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { TSupportedApplications } from '../../types/Application';

export const getClusterURL = async (cwd: string, product: TSupportedApplications): Promise<string> => {

  // Change the working directory to the Kubernetes utils directory
  const baseDir = join(cwd, 'app/util/k8s');

  // Check if we can find the outputs.json file that was created during provisioning
  const hasOutputsJSON = existsSync(join(baseDir, 'outputs.json'));
  if (!hasOutputsJSON) {
    throw new Error(`Could not find the required 'outputs.json' file, which is usually generated after provisioning the environment.`);
  }

  // Get the cluster creation output data
  const contents = readFileSync(join(baseDir, 'outputs.json'), 'utf-8');
  const outputs = JSON.parse(contents);

  // Try to find the product loadbalancer URL from the output data
  const loadbalancerUrls = outputs?.product_urls?.value;
  if (loadbalancerUrls) {
    const loadbalancerUrl = loadbalancerUrls[product];
    if (loadbalancerUrl) {
      return loadbalancerUrl;
    }
  }

  // If we haven't found it yet, we should throw a hissy fit
  throw new Error(`Could not find the ${product} load balancer URL, are you sure the product was correctly provisioned?`);
}