
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { XMLParser } from 'fast-xml-parser';
import { existsSync, readFileSync } from 'fs'
import xpath from 'xpath';

import { SupportedApplications } from '../types/SupportedApplications';

export class AMPS {

  public static isAtlassianPlugin = (): boolean => {
    try {
      const hasPomFile = existsSync('./pom.xml');
      if (hasPomFile) {
        const content = readFileSync('./pom.xml', 'utf8');
        const parser = new XMLParser();
        const pom = parser.parse(content);
        return pom?.project?.packaging === 'atlassian-plugin';
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  public static getApplication(): SupportedApplications|null {
    const applications = AMPS.getApplications();
    return applications.length === 1 ? applications[0] : null;
  }

  public static getApplications(): Array<SupportedApplications> {
    const result = new Set<SupportedApplications>();
    if (AMPS.isAtlassianPlugin()) {
      const xml = readFileSync('./pom.xml', 'utf8');
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const nodes = xpath.select('//*[local-name()=\'groupId\' and text()=\'com.atlassian.maven.plugins\']', doc);
      if (Array.isArray(nodes)) {
        nodes.forEach(node => {
          const parentNode = node.parentNode;
          if (parentNode) {
            const parser = new XMLParser();
            const { plugin } = parser.parse(new XMLSerializer().serializeToString(parentNode));
            if (plugin?.artifactId?.includes(SupportedApplications.JIRA)) {
              result.add(SupportedApplications.JIRA);
            } else if (plugin?.artifactId?.includes(SupportedApplications.CONFLUENCE)) {
              result.add(SupportedApplications.CONFLUENCE);
            } else if (plugin?.artifactId?.includes(SupportedApplications.BAMBOO)) {
              result.add(SupportedApplications.BAMBOO);
            } else if (plugin?.artifactId?.includes(SupportedApplications.BITBUCKET)) {
              result.add(SupportedApplications.BITBUCKET);
            }
          }
        });
      }
    }
    return Array.from(result);
  }

}