import { Bamboo } from '../applications/bamboo';
import { Bitbucket } from '../applications/bitbucket';
import { Confluence } from '../applications/confluence';
import { Jira } from '../applications/jira';
import { Application, SupportedApplications, TApplicationOptions } from '../types/Application';

export const getApplication = (options: TApplicationOptions): Application => {
  switch (options.name) {
    case SupportedApplications.Values.jira: return new Jira(options);
    case SupportedApplications.Values.confluence: return new Confluence(options);
    case SupportedApplications.Values.bamboo: return new Bamboo(options);
    case SupportedApplications.Values.bitbucket: return new Bitbucket(options);
  }
}