import { join } from 'path';

import { replaceLinesInFile } from '../../helpers/replaceLinesInFile';
import { provisioning } from '../messages';

export const persistClusterConfiguration = (cwd: string, environment: string, product: string, license: string, nodes: number = 1) => {
  replaceLinesInFile(join(cwd, 'app/util/k8s/dcapt.tfvars'), (line) => {
    if (line.startsWith('environment_name =')) {
      return `environment_name = "${environment}"`
    } else if (line.startsWith('products = ')) {
      return `products = ["${product}"]`;
    } else if (line.startsWith(`${product}_license =`)) {
      return `${product}_license = "${license}"`
    } else if (line.startsWith(`${product}_replica_count =`)) {
      return `${product}_replica_count = ${nodes}`;
    } else if (line.startsWith(`${product}_additional_jvm_args = `)) {
      return `${product}_additional_jvm_args = ["-Dupm.plugin.upload.enabled=true","-Dpassword.confirmation.disabled=true"]`;
    }
    return line;
  })
  console.log(provisioning.terraformConfigurationPersisted);
}
