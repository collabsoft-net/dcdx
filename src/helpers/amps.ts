
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { ChildProcess, spawn } from 'child_process';
import { XMLParser } from 'fast-xml-parser';
import { existsSync, readFileSync } from 'fs'
import { cwd } from 'process';
import xpath from 'xpath';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

import { SupportedApplications } from '../types/SupportedApplications';

const { P, activeProfiles } = yargs(hideBin(process.argv)).parseSync();
const profile = P as string || activeProfiles as string || undefined;

export class AMPS {

  private static maven: ChildProcess|null;

  // ------------------------------------------------------------------------------------------ Public Static Methods

  public static stop() {
    if (AMPS.maven) {
      AMPS.maven.kill(0);
    }
  }

  public static async build(args: Array<string>) {
    return new Promise<void>((resolve, reject) => {
      if (AMPS.maven) {
        const killed = AMPS.maven.kill(0);
        if (!killed) {
          reject(new Error('Failed to terminate existing Maven process'));
        }
      }

      AMPS.maven = spawn(
        'mvn',
        [ 'package', ...args ],
        { cwd: cwd(), stdio: 'inherit' }
      );

      AMPS.maven.on('exit', (code) => {
        AMPS.maven = null;
        if (code === 0 || code === 130) {
          resolve();
        } else {
          reject(new Error(`Maven exited with code ${code}`));
        }
      });
    });
  }

  public static isAtlassianPlugin = (): boolean => {
    try {
      const nodes = AMPS.getNodes('//*[local-name()=\'packaging\']');
      return nodes.some(item => item.textContent === 'atlassian-plugin');
    } catch (err) {
      return false;
    }
  }

  public static getApplicationVersion(): string|undefined {
    const node = !profile
      ? AMPS.getNodes('//*[local-name()=\'groupId\' and text()=\'com.atlassian.maven.plugins\']', true)
      : AMPS.getNodes(`//*[local-name()='profile']/*[local-name()='id' and text()='${profile}']/..//*[local-name()='groupId' and text()='com.atlassian.maven.plugins']`, true);

    if (node) {
      const parentNode = node.parentNode;
      if (parentNode) {
        const { plugin } = AMPS.toObject(parentNode);
        const version = plugin?.configuration?.productVersion;
        return version ? this.doPropertyReplacement(version) : undefined;
      }
    }
    return undefined;
  }

  public static getApplication(): SupportedApplications|null {
    const applications = AMPS.getApplications();
    if (applications.length === 1) {
      return applications[0];
    } else if (profile) {
      const profileApplications = AMPS.getApplications(profile);
      if (profileApplications.length === 1) {
        return profileApplications[0];
      }
    }
    return null;
  }

  public static getApplications(profile?: string): Array<SupportedApplications> {
    const result = new Set<SupportedApplications>();
    const nodes = !profile
      ? AMPS.getNodes('//*[local-name()=\'groupId\' and text()=\'com.atlassian.maven.plugins\']')
      : AMPS.getNodes(`//*[local-name()='profile']/*[local-name()='id' and text()='${profile}']/..//*[local-name()='groupId' and text()='com.atlassian.maven.plugins']`);

    nodes.forEach(node => {
      const parentNode = node.parentNode;
      if (parentNode) {
        const { plugin } = AMPS.toObject(parentNode);
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

    return Array.from(result);
  }

  // ------------------------------------------------------------------------------------------ Private Static Methods

  private static doPropertyReplacement(value: string) {
    let result = value;

    // If there is a profile, replace profile properties first as they take precedence
    const profileProperties = profile ? AMPS.getProperties(profile) : {};
    Object.entries(profileProperties).forEach(([propertyKey, propertyValue]) => {
      result = result.replaceAll(`$\{${propertyKey}}`, propertyValue);
    });

    const properties = AMPS.getProperties();
    Object.entries(properties).forEach(([propertyKey, propertyValue]) => {
      result = result.replaceAll(`$\{${propertyKey}}`, propertyValue);
    });

    return result;
  }

  private static getProperties(profile?: string): Record<string, string> {
    const result: Record<string, string> = {};

    const nodes = !profile
      ? AMPS.getNodes('//*[local-name()=\'properties\']')
      : AMPS.getNodes(`//*[local-name()='profile']/*[local-name()='id' and text()='${profile}']/..//*[local-name()='properties']`);

    nodes.forEach(node => {
      const { properties } = AMPS.toObject(node);
      Object.entries(properties as Record<string, string>).forEach(([ key, value ]) => result[key] = value);
    });
    return result;
  }

  private static getNodes(expression: string): Array<Node>;
  private static getNodes(expression: string, single: true): Node|null;
  private static getNodes(expression: string, single?: true): Array<Node>|Node|null {
    const hasPomFile = existsSync('./pom.xml');
    if (hasPomFile) {
      const xml = readFileSync('./pom.xml', 'utf8');
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const nodes = single ? xpath.select(expression, doc, true) : xpath.select(expression, doc, false);
      if (Array.isArray(nodes)) {
        return nodes;
      } else if (single) {
        return nodes as Node;
      } else {
        return [];
      }
    }
    return [];
  }

  private static toObject(node: Node) {
    try {
      const parser = new XMLParser();
      return parser.parse(new XMLSerializer().serializeToString(node));
    } catch (err) {
      return null;
    }
  }

}