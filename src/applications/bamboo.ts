
import axios from 'axios';

import { timebomb } from '../helpers/licences';
import { toAbsolutePath } from '../helpers/toAbsolutePath';
import { ApplicationOptions } from '../types/ApplicationOptions';
import { DatabaseEngine } from '../types/DatabaseEngine';
import { Service } from '../types/DockerComposeV3';
import { SupportedApplications } from '../types/SupportedApplications';
import { Base } from './base';

export class Bamboo extends Base {

  name = SupportedApplications.BAMBOO;
  database: DatabaseEngine;
  logFilePath = '/var/atlassian/application-data/bamboo/logs/atlassian-bamboo.log';

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(options: ApplicationOptions) {
    super(options);
    this.database = this.getDatabaseEngine(options.database);
  }

  // ------------------------------------------------------------------------------------------ Protected Methods

  protected getService(): Service {

    const volumes = this.getVolumes();
    const environment = this.getEnvironmentVariables();

    return {
      build: {
        context: toAbsolutePath('../../assets'),
        dockerfile_inline: `
FROM dcdx/${this.name}:${this.options.version}
COPY ./mysql-connector-j-8.3.0.jar /opt/atlassian/bamboo/lib/mysql-connector-j-8.3.0.jar
COPY ./quickreload-5.0.2.jar /var/atlassian/application-data/bamboo/shared/plugins/quickreload-5.0.2.jar
RUN echo "/opt/quickreload" > /var/atlassian/application-data/bamboo/quickreload.properties; \
    mkdir -p /opt/quickreload; \
    chown -R bamboo:bamboo /opt/quickreload;

RUN chown -R bamboo:bamboo /var/atlassian/application-data/bamboo`
      },
      ports: [
        `${this.options.port || 80}:8085`,
        ...this.options.debug ? [ '5005:5005' ] : [],
      ],
      environment: Object.keys(environment).length > 0 ? environment : undefined,
      volumes: volumes.length > 0 ? volumes : undefined,
      networks: [ 'shared' ]
    }
  }

  protected getJVMArgs(): Array<string> {
    const JVM_SUPPORT_RECOMMENDED_ARGS = super.getJVMArgs();
    if (this.options.debug) {
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Xdebug');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005');
    }
    return JVM_SUPPORT_RECOMMENDED_ARGS;
  }

  protected async isApplicationReady(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/setup/setupGeneralConfiguration.action`, { validateStatus: () => true }).catch(() => null);
      return response?.status === 200;
    } catch (err) {
      return false;
    }
  }

  // ------------------------------------------------------------------------------------------ Private Methods

  private getEnvironmentVariables() {
    return {
      ...this.options.contextPath ? { 'ATL_TOMCAT_CONTEXTPATH': this.options.contextPath } : '',
      'JVM_SUPPORT_RECOMMENDED_ARGS': this.getJVMArgs().join(' '),
      'ATL_BAMBOO_ENABLE_UNATTENDED_SETUP': 'true',
      'ATL_LICENSE': this.options.license || timebomb.bamboo,
      'ATL_JDBC_URL': this.database.url,
      'ATL_JDBC_USER': this.database.options.username,
      'ATL_JDBC_PASSWORD': this.database.options.password,
      'ATL_DB_TYPE': `${this.database.name}`,
    }
  };

  private getVolumes() {
    return [
      ...this.options.quickReload ? [ `${this.options.quickReload}:/opt/quickreload` ] : ''
    ];
  }

}