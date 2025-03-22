import { z } from 'zod';

export const FileWatcherOptions = z.object({
  outputDirectory: z.string(),
  ext: z.array(z.string()),
  install: z.boolean(),
  obr: z.boolean(),
  baseUrl: z.string(),
  username: z.string(),
  password: z.string(),
  port: z.number(),
  exec: z.string(),
  activateProfiles: z.string(),
  cwd: z.string()
}).partial({
  outputDirectory: true,
  ext: true,
  install: true,
  obr: true,
  baseUrl: true,
  username: true,
  password: true,
  port: true,
  exec: true,
  activateProfiles: true,
  cwd: true
});

export type TFileWatcherOptions = z.infer<typeof FileWatcherOptions>