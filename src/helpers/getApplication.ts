import { Bamboo } from '../applications/bamboo';
import { Bitbucket } from '../applications/bitbucket';
import { Confluence } from '../applications/confluence';
import { Jira } from '../applications/jira';
import { SupportedApplications } from '../types/SupportedApplications';


export const getApplicationByName = (name: SupportedApplications) => {
  switch (name) {
    case SupportedApplications.JIRA: return Jira;
    case SupportedApplications.CONFLUENCE: return Confluence;
    case SupportedApplications.BAMBOO: return Bamboo;
    case SupportedApplications.BITBUCKET: return Bitbucket;
  }
}