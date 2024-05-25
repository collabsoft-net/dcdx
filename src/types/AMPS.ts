import { z } from 'zod';

import { ApplicationOptions } from './Application';

export const BuildOptions = z.object({
  watch: z.boolean(),
  ext: z.array(z.string()),
  install: z.boolean(),
  outputDirectory: z.string(),
  activateProfiles: z.string(),
  cwd: z.string()
}).partial({
  watch: true,
  ext: true,
  outputDirectory: true,
  activateProfiles: true,
  cwd: true
});

export const DebugOptions = z.intersection(ApplicationOptions.omit({ name: true }), BuildOptions);

export type TBuildOptions = z.infer<typeof BuildOptions>;
export type TDebugOptions = z.infer<typeof DebugOptions>;