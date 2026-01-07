import { z } from 'zod';

import { SupportedApplications } from './Application';
import { ConfigureBamboo, ConfigureBitbucket, ConfigureConfluence, ConfigureJira } from './Configure';

export const Config = z.object({
  setup: z.object({
    [SupportedApplications.Values.jira]: ConfigureJira,
    [SupportedApplications.Values.confluence]: ConfigureConfluence,
    [SupportedApplications.Values.bamboo]: ConfigureBamboo,
    [SupportedApplications.Values.bitbucket]: ConfigureBitbucket
  }).partial()
}).default({
  setup: {
    [SupportedApplications.Values.jira]: ConfigureJira.parse(undefined),
    [SupportedApplications.Values.confluence]: ConfigureConfluence.parse(undefined),
    [SupportedApplications.Values.bamboo]: ConfigureBamboo.parse(undefined),
    [SupportedApplications.Values.bitbucket]: ConfigureBitbucket.parse(undefined)
  }
});

export type DCDX = z.infer<typeof Config>;
