
import axios from 'axios';

import { timebomb } from '../helpers/licences';
import { toAbsolutePath } from '../helpers/toAbsolutePath';
import { SupportedApplications, TApplicationOptions } from '../types/Application';
import { DatabaseEngine } from '../types/Database';
import { Service } from '../types/DockerComposeV3';
import { Base } from './base';

export class Bamboo extends Base {

  name = SupportedApplications.Values.bamboo;
  database: DatabaseEngine;
  logFilePath = '/var/atlassian/application-data/bamboo/logs/atlassian-bamboo.log';

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(options: TApplicationOptions) {
    super(options);
    this.database = this.getDatabaseEngine(options.database);
  }

  // ------------------------------------------------------------------------------------------ Protected Methods

  protected getService(): Service {

    const environment = this.getEnvironmentVariables();

    return {
      build: {
        context: toAbsolutePath('../../assets'),
        dockerfile_inline: `
FROM dcdx/${this.name}:${this.options.tag}
COPY ./mysql-connector-j-8.3.0.jar /opt/atlassian/bamboo/lib/mysql-connector-j-8.3.0.jar
COPY ./quickreload-5.0.4.jar /var/atlassian/application-data/bamboo/shared/plugins/quickreload-5.0.4.jar
RUN echo "/opt/quickreload" > /var/atlassian/application-data/bamboo/quickreload.properties; \
    mkdir -p /opt/quickreload; \
    chown -R bamboo:bamboo /opt/quickreload;

RUN chown -R bamboo:bamboo /var/atlassian/application-data/bamboo`
      },
      ports: [
        `${this.options.port || 80}:8085`,
        ...this.options.debug ? [ '5005:5005' ] : [],
      ],
      environment,
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
      if (response?.status === 200) {
        console.log(`The application ${this.name} is ready on ${this.baseUrl} 🎉`);
        return true;
      }
      return false
    } catch (err) {
      return false;
    }
  }

  // ------------------------------------------------------------------------------------------ Private Methods

  private getEnvironmentVariables() {
    return {
      ...this.options.contextPath ? { 'ATL_TOMCAT_CONTEXTPATH': this.options.contextPath } : '',
      ...this.options.xms ? { 'JVM_MINIMUM_MEMORY': this.options.xms } : '',
      ...this.options.xmx ? { 'JVM_MAXIMUM_MEMORY': this.options.xmx } : '',
      'JVM_SUPPORT_RECOMMENDED_ARGS': this.getJVMArgs().join(' '),
      'ATL_BAMBOO_ENABLE_UNATTENDED_SETUP': 'true',
      'ATL_LICENSE': timebomb.bamboo,
      'ATL_JDBC_URL': this.database.url,
      'ATL_JDBC_USER': this.database.options.username,
      'ATL_JDBC_PASSWORD': this.database.options.password,
      'ATL_DB_TYPE': `${this.database.options.name}`,
    }
  };

}