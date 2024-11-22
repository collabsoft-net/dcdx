import { Bamboo } from '../applications/bamboo';
import { Bitbucket } from '../applications/bitbucket';
import { Confluence } from '../applications/confluence';
import { Jira } from '../applications/jira';
import { Application, ApplicationOptions, SupportedApplications, TApplicationOptions } from '../types/Application';

export const getApplication = (options: TApplicationOptions): Application => {
  switch (options.name) {
    case SupportedApplications.Values.jira: return new Jira(ApplicationOptions.parse(options));
    case SupportedApplications.Values.confluence: return new Confluence(ApplicationOptions.parse(options));
    case SupportedApplications.Values.bamboo: return new Bamboo(ApplicationOptions.parse(options));
    case SupportedApplications.Values.bitbucket: return new Bitbucket(ApplicationOptions.parse(options));
  }
}