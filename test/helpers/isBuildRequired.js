import { SupportedApplications } from '../../src/types/Application';

export const isBuildRequired = {
  [SupportedApplications.Values.jira] : (required) => required ? '8.22.6' : '9.0.0',
  [SupportedApplications.Values.confluence]: (required) => required ? '7.20.3' : '8.0.0',
  [SupportedApplications.Values.bitbucket]: (required) => required ? '8.1.0' : '8.2.0',
  [SupportedApplications.Values.bamboo]: (required) => required ? '8.2.9' : '9.0.0'
}
