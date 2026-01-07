import { join } from 'path';
import { cwd } from 'process';

import { replaceLinesInFile } from '../../helpers/replaceLinesInFile';
import { TAPTProvisionOptions } from '../../types/DCAPT';
import { provisioning } from '../messages';

export const persistClusterConfiguration = (options: TAPTProvisionOptions) => {
  replaceLinesInFile(join(options.cwd || cwd(), 'app/util/k8s/dcapt.tfvars'), (line) => {
    if (options.environment && line.startsWith('environment_name =')) {
      return `environment_name = "${options.environment}"`
    } else if (options.product && line.startsWith('products = ')) {
      return `products = ["${options.product}"]`;
    } else if (options.product && options.license && line.startsWith(`${options.product}_license =`)) {
      return `${options.product}_license = "${options.license}"`
    } else if (options.product && options.tag && line.startsWith(`${options.product}_version_tag =`)) {
      return `${options.product}_version_tag = "${options.tag}"`
    } else if (options.product && line.startsWith(`${options.product}_replica_count =`)) {
      return `${options.product}_replica_count = ${options.nodes || '1'}`;
    } else if (options.product && line.startsWith(`${options.product}_additional_jvm_args = `)) {
      return `${options.product}_additional_jvm_args = ["-Dupm.plugin.upload.enabled=true","-Dpassword.confirmation.disabled=true"]`;
    }
    return line;
  })
  console.log(provisioning.terraformConfigurationPersisted);
}
