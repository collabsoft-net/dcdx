

import { z } from 'zod';

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

export type TInstallArgs = z.infer<typeof InstallArgs>;