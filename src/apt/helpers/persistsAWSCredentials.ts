import { writeFileSync } from 'fs';
import { join } from 'path';

import { provisioning } from '../messages';

export const persistAWSCredentials = (cwd: string, aws_access_key_id: string, aws_secret_access_key: string) => {
  writeFileSync(join(cwd, 'app/util/k8s/aws_envs'), `
# aws_envs file should contain AWS variables needed for authorization (without quotes)
AWS_ACCESS_KEY_ID=${aws_access_key_id}
AWS_SECRET_ACCESS_KEY=${aws_secret_access_key}
`.trim(), 'utf-8');

  console.log(provisioning.awsCredentialsPersisted);
}
