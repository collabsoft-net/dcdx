

import { z } from 'zod';

import { APTRestartOptions } from './DCAPT';

export const InstallArgs = z.object({
  watch: z.boolean(),
  outputDirectory: z.string(),
  obr: z.boolean(),
  username: z.string(),
  password: z.string(),
  activateProfiles: z.string(),
  mpac: z.boolean(),
  baseUrl: z.string(),
  appKey: z.string(),
  license: z.string(),
  cwd: z.string()
}).partial({
  outputDirectory: true,
  obr: true,
  username: true,
  password: true,
  activateProfiles: true,
  mpac: true,
  baseUrl: true,
  appKey: true,
  cwd: true
});

export const InstallOptions = APTRestartOptions.extend({
  baseUrl: z.string(),
  appKey: z.string(),
  license: z.string(),
  username: z.string(),
  password: z.string(),
  restartAfterInstall: z.boolean(),
  force: z.boolean()
}).partial({
  appKey: true,
  license: true,
  username: true,
  password: true,
  restartAfterInstall: true,
  product: true,
  cwd: true,
  environment: true,
  aws_access_key_id: true,
  aws_secret_access_key: true,
  force: true
})

export type TInstallArgs = z.infer<typeof InstallArgs>;
export type TInstallOptions = z.infer<typeof InstallOptions>;