
import { z } from 'zod';

export const InstallerOptions = z.object({
  obr: z.boolean(),
  username: z.string(),
  password: z.string(),
  port: z.number(),
  cwd: z.string()
}).partial({
  obr: true,
  username: true,
  password: true,
  port: true,
  cwd: true
})

export type TInstallerOptions = z.infer<typeof InstallerOptions>;