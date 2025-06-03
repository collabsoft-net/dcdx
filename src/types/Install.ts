

import { z } from 'zod';

import { SupportedApplications } from './Application';
import { APTRestartOptions } from './DCAPT';

export const InstallOptions = APTRestartOptions.extend({
  baseUrl: z.string(),
  appKey: z.string(),
  archive: z.string(),
  license: z.string(),
  username: z.string(),
  password: z.string(),
  restartAfterInstall: z.boolean(),
  force: z.boolean()
}).partial({
  appKey: true,
  archive: true,
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
});

export const InstallFromAMPSArgs = z.object({
  watch: z.boolean(),
  outputDirectory: z.string(),
  obr: z.boolean(),
  baseUrl: z.string(),
  username: z.string(),
  password: z.string(),
  license: z.string(),
  activateProfiles: z.string(),
  cwd: z.string()
}).partial({
  watch: true,
  outputDirectory: true,
  obr: true,
  baseUrl: true,
  username: true,
  password: true,
  license: true,
  activateProfiles: true,
  cwd: true
});

export const InstallFromAMPSOptions = z.object({
  watch: z.boolean(),
  outputDirectory: z.string(),
  obr: z.boolean(),
  baseUrl: z.string(),
  username: z.string(),
  password: z.string(),
  license: z.string(),
  activateProfiles: z.string(),
  cwd: z.string()
});

export const InstallFromMPACArgs = z.object({
  appKey: z.string(),
  baseUrl: z.string(),
  username: z.string(),
  password: z.string(),
  license: z.string()
}).partial({
  baseUrl: true,
  username: true,
  password: true,
  license: true
});

export const InstallFromMPACOptions = z.object({
  appKey: z.string(),
  baseUrl: z.string(),
  username: z.string(),
  password: z.string(),
  license: z.string()
});

export const InstallFromURLArgs = z.object({
  path: z.string(),
  baseUrl: z.string(),
  username: z.string(),
  password: z.string(),
  license: z.string(),
}).partial({
  baseUrl: true,
  username: true,
  password: true,
  license: true
});

export const InstallFromURLOptions = z.object({
  path: z.string(),
  baseUrl: z.string(),
  username: z.string(),
  password: z.string(),
  license: z.string(),
  verbose: z.boolean()
}).partial();

export const InstallWithQuickReloadOptions = InstallFromURLOptions.extend({
  path: z.string(),
  product: SupportedApplications,
});

export type TInstallOptions = z.infer<typeof InstallOptions>;

export type TInstallFromAMPSArgs = z.infer<typeof InstallFromAMPSArgs>;
export type TInstallFromAMPSOptions = z.infer<typeof InstallFromAMPSOptions>;

export type TInstallFromMPACArgs = z.infer<typeof InstallFromMPACArgs>;
export type TInstallFromMPACOptions = z.infer<typeof InstallFromMPACOptions>;

export type TInstallFromURLArgs = z.infer<typeof InstallFromURLArgs>;
export type TInstallFromURLOptions = z.infer<typeof InstallFromURLOptions>;

export type TInstallWithQuickReloadOptions = z.infer<typeof InstallWithQuickReloadOptions>;