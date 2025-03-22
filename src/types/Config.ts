import { z } from 'zod';

import { SupportedApplications } from './Application';
import { ConfigureConfluence, ConfigureJira } from './Configure';

export const Config = z.object({
  setup: z.object({
    [SupportedApplications.Values.jira]: ConfigureJira,
    [SupportedApplications.Values.confluence]: ConfigureConfluence,
    [SupportedApplications.Values.bamboo]: z.object({}),
    [SupportedApplications.Values.bitbucket]: z.object({})
  }).partial()
});

export type DCDX = z.infer<typeof Config>;
