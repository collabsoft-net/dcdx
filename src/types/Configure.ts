import { z } from 'zod';

import { SupportedApplications } from './Application';

export const ConfigureOptions = z.object({
  product: SupportedApplications,
  config: z.string(),
  cwd: z.string()
}).partial({
  config: true,
  cwd: true
});

export const ConfigureJira = z.object({
  title: z.string(),
  mode: z.enum([ 'private', 'public' ]),
  baseUrl: z.string(),
  fullname: z.string(),
  email: z.string(),
  username: z.string(),
  password: z.string(),
  configureEmail: z.enum([ 'later', 'now' ]),
  emailName: z.string(),
  emailFromAddress: z.string(),
  emailPrefix: z.string(),
  emailServerType: z.enum([ 'smtp', 'jndi' ]),
  emailJndiLocation: z.string(),
  emailServiceProvider: z.enum([ 'custom', 'google-apps-mail-/-gmail-8', 'yahoo!-mail-plus-9']),
  emailHostName: z.string(),
  emailProtocol: z.enum([ 'SMTP', 'SECURE_SMTP' ]),
  emailPort: z.number(),
  emailTimeout: z.number(),
  emailTLS: z.boolean(),
  emailUsername: z.string(),
  emailPassword: z.string(),
  language: z.enum([
    'en-US',
    'zh_CN',
    'cs_CZ',
    'da_DK',
    'nl_NL',
    'en_UK',
    'et_EE',
    'fi_FI',
    'fr_FR',
    'de_DE',
    'hu_HU',
    'is_IS',
    'it_IT',
    'ja_JP',
    'ko_KR',
    'no_NO',
    'pl_PL',
    'pt_BR',
    'ro_RO',
    'ru_RU',
    'sk_SK',
    'es_ES',
    'sv_SE'
  ]),
  avatarPath: z.string()
}).partial({
  emailName: true,
  emailFromAddress: true,
  emailPrefix: true,
  emailServerType: true,
  emailJndiLocation: true,
  emailServiceProvider: true,
  emailHostName: true,
  emailProtocol: true,
  emailPort: true,
  emailTimeout: true,
  emailTLS: true,
  emailUsername: true,
  emailPassword: true,
  language: true,
  avatarPath: true
});

export const ConfigureConfluence = z.object({
  baseUrl: z.string(),
  deploymentType: z.enum(['non-clustered', 'clustered']),
  username: z.string(),
  fullName: z.string(),
  email: z.string(),
  password: z.string(),
  clusterName: z.string(),
  clusterHome: z.string(),
  clusterJoinMode: z.enum(['useMulticast', 'useTcpIp', 'useAws']),
  clusterAutoAddress: z.boolean(),
  loadContent: z.enum(['example', 'empty']),
  userManagement: z.enum(['confluence', 'jira']),
  jiraBaseUrl: z.string(),
  jiraUsername: z.string(),
  jiraPassword: z.string(),
  jiraUserGroups: z.string(),
  jiraAdminGroups: z.string(),
}).partial({
  clusterName: true,
  clusterHome: true,
  clusterJoinMode: true,
  clusterAutoAddress: true,
  jiraBaseUrl: true,
  jiraUsername: true,
  jiraPassword: true,
  jiraUserGroups: true,
  jiraAdminGroups: true
});

export type TConfigureOptions = z.infer<typeof ConfigureOptions>;

export type TConfigureJira = z.infer<typeof ConfigureJira>;
export type TConfigureConfluence = z.infer<typeof ConfigureConfluence>;