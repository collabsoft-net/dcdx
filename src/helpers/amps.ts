
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { ChildProcess, spawn } from 'child_process';
import { XMLParser } from 'fast-xml-parser';
import { existsSync, readFileSync } from 'fs'
import { join } from 'path';
import { cwd } from 'process';
import xpath from 'xpath';

import { SupportedApplications, TSupportedApplications } from '../types/Application';

type AMPSOptions = {
  cwd?: string;
  profiles: Array<string>
}

export class AMPS {

  private maven: ChildProcess|null = null;

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(private options: AMPSOptions = {
    profiles: []
  }) {}

  // ------------------------------------------------------------------------------------------ Public Methods

  public stop() {
    if (this.maven) {
      const killed = this.maven.kill(0);
      if (!killed) {
        throw new Error('Failed to terminate existing Maven process');
      }
    }
  }

  public async build(args: Array<string>) {
    return new Promise<void>((resolve, reject) => {
      if (this.maven) {
        const killed = this.maven.kill(0);
        if (!killed) {
          reject(new Error('Failed to terminate existing Maven process'));
        }
      }

      this.maven = spawn(
        'mvn',
        [ 'package', ...args ],
        { cwd: this.options?.cwd || cwd(), stdio: 'inherit' }
      );

      this.maven.on('exit', (code) => {
        this.maven = null;
        if (code === 0 || code === 130) {
          resolve();
        } else {
          reject(new Error(`Maven exited with code ${code}`));
        }
      });
    });
  }

  public isAtlassianPlugin = (): boolean => {
    try {
      const nodes = this.getNodes('//*[local-name()=\'packaging\']');
      return nodes.some(item => item.textContent === 'atlassian-plugin');
    } catch (err) {
      return false;
    }
  }

  public getApplicationVersion(): string|undefined {
    const applications = this.getApplications();
    if (applications.size === 1) {
      const [ , version ] = applications.entries().next().value;
      return version;
    } else if (applications.size > 1) {
      throw new Error('The Atlassian Plugin project contains multiple AMPS configuration, unable to decide which product to use 😰')
    }
    return undefined;
  }

  public getApplication(): TSupportedApplications|null {
    const applications = this.getApplications();
    if (applications.size === 1) {
      const [ name ] = applications.entries().next().value;
      return name;
    } else if (applications.size > 1) {
      throw new Error('The Atlassian Plugin project contains multiple AMPS configuration, unable to decide which product to use 😰')
    }
    return null;
  }

  public getApplications(): Map<TSupportedApplications, string|undefined> {
    const result = new Map<TSupportedApplications, string|undefined>();

    const nodes = this.getNodes('//*[local-name()=\'groupId\' and text()=\'com.atlassian.maven.plugins\']');
    const nodesWithActiveProfile = nodes.filter(node => this.isActivatedProfile(node));

    nodesWithActiveProfile.forEach(node => {
      const version = this.getVersion(node);
      const parentNode = node.parentNode;
      if (parentNode) {
        const { plugin } = this.toObject(parentNode);
        if (plugin?.artifactId?.includes(SupportedApplications.Values.jira)) {
          result.set(SupportedApplications.Values.jira, version);
        } else if (plugin?.artifactId?.includes(SupportedApplications.Values.confluence)) {
          result.set(SupportedApplications.Values.confluence, version);
        } else if (plugin?.artifactId?.includes(SupportedApplications.Values.bamboo)) {
          result.set(SupportedApplications.Values.bamboo, version);
        } else if (plugin?.artifactId?.includes(SupportedApplications.Values.bitbucket)) {
          result.set(SupportedApplications.Values.bitbucket, version);
        }
      }
    });

    return result;
  }

  // ------------------------------------------------------------------------------------------ Private Methods

  private getVersion(node: Node): string|undefined {
    const parentNode = node.parentNode;
    if (parentNode) {
      const { plugin } = this.toObject(parentNode);
      const { configuration } = plugin || {};

      if (configuration?.productVersion) {
        return this.doPropertyReplacement(plugin.configuration.productVersion);
      } else if (configuration?.products) {
        const product = Array.isArray(configuration?.products) ? configuration?.products[0] : configuration.products.product;
        if (product && product.version) {
          return this.doPropertyReplacement(product.version);
        }
      }
    }
    return undefined;
  }

  private doPropertyReplacement(value: string) {
    let result = value;

    // If there is a profile, replace profile properties first as they take precedence
    const profileProperties = this.getProperties();
    Object.entries(profileProperties).forEach(([propertyKey, propertyValue]) => {
      result = result.replaceAll(`$\{${propertyKey}}`, propertyValue);
    });

    const properties = this.getProperties();
    Object.entries(properties).forEach(([propertyKey, propertyValue]) => {
      result = result.replaceAll(`$\{${propertyKey}}`, propertyValue);
    });

    return result;
  }

  private getProperties(): Record<string, string> {
    const result: Record<string, string> = {};

    const nodes = this.getNodes('//*[local-name()=\'properties\']');
    const nodesWithActiveProfile = nodes.filter(node => this.isActivatedProfile(node));

    nodesWithActiveProfile.forEach(node => {
      const { properties } = this.toObject(node);
      Object.entries(properties as Record<string, string>).forEach(([ key, value ]) => result[key] = value);
    });

    return result;
  }

  private getNodes(expression: string): Array<Node>;
  private getNodes(expression: string, single: true): Node|null;
  private getNodes(expression: string, single?: true): Array<Node>|Node|null {
    const pomFilePath = join(this.options?.cwd || cwd(), './pom.xml');
    const hasPomFile = existsSync(pomFilePath);
    if (hasPomFile) {
      const xml = readFileSync(pomFilePath, 'utf8');
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

  private toObject(node: Node) {
    try {
      const parser = new XMLParser();
      return parser.parse(new XMLSerializer().serializeToString(node));
    } catch (err) {
      return null;
    }
  }

  private findParentNodeByTagName(tagName: string, node: Node): Node|null {
    const { parentNode } = node;
    if (parentNode) {
      if (parentNode.nodeName.toLowerCase() === tagName.toLowerCase()) {
        return parentNode;
      }
      return this.findParentNodeByTagName(tagName, parentNode);
    }
    return null;
  }

  private isActivatedProfile(node: Node) {
    const profileParentNode = this.findParentNodeByTagName('profile', node);
    const profileNode = profileParentNode ? this.toObject(profileParentNode) : null;

    if (!profileNode) {
      return true;
    } else if (profileNode && (profileNode.activeByDefault === 'true' || this.options.profiles.includes(profileNode.profile.id))) {
      return true;
    } else {
      return false;
    }
  }

}