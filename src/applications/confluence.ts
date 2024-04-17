
import { timebomb } from '../helpers/licences';
import { toAbsolutePath } from '../helpers/toAbsolutePath';
import { ApplicationOptions } from '../types/ApplicationOptions';
import { DatabaseEngine } from '../types/DatabaseEngine';
import { Service } from '../types/DockerComposeV3';
import { SupportedApplications } from '../types/SupportedApplications';
import { Base } from './base';

export class Confluence extends Base {

  name = SupportedApplications.CONFLUENCE;
  database: DatabaseEngine;
  logFilePath = '/var/atlassian/application-data/confluence/logs/atlassian-confluence.log';

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(options: ApplicationOptions) {
    super(options);
    this.database = this.getDatabaseEngine(options.database);
  }

  // ------------------------------------------------------------------------------------------ Protected Methods

  protected getService = (): Service => {

    const volumes = this.getVolumes();
    const environment = this.getEnvironmentVariables();

    return {
      build: {
        context: toAbsolutePath('../../assets'),
        dockerfile_inline: `
FROM dcdx/${this.name}:${this.options.version}
COPY ./mysql-connector-j-8.3.0.jar /opt/atlassian/confluence/confluence/WEB-INF/lib/mysql-connector-j-8.3.0.jar
COPY ./quickreload-5.0.2.jar /opt/atlassian/confluence/confluence/WEB-INF/atlassian-bundled-plugins/quickreload-5.0.2.jar
RUN echo "/opt/quickreload" > /var/atlassian/application-data/confluence/quickreload.properties; \
    mkdir -p /opt/quickreload; \
    chown -R confluence:confluence /opt/quickreload;

RUN chown -R confluence:confluence /opt/atlassian/confluence`
      },
      ports: [
        `${this.options.port || 80}:8090`,
        ...this.options.debug ? [ '5005:5005' ] : [],
      ],
      environment: Object.keys(environment).length > 0 ? environment : undefined,
      volumes: volumes.length > 0 ? volumes : undefined,
      networks: [ 'shared' ]
    }
  }

  // ------------------------------------------------------------------------------------------ Private Methods

  private getEnvironmentVariables() {
    return {
      ...this.options.contextPath ? { 'ATL_TOMCAT_CONTEXTPATH': this.options.contextPath } : '',
      ...this.options.debug ? { 'JVM_SUPPORT_RECOMMENDED_ARGS': this.getJVMArgs() } : '',
      'ATL_LICENSE_KEY': this.options.license || timebomb.confluence,
      'ATL_JDBC_URL': this.database.url,
      'ATL_JDBC_USER': this.database.options.username,
      'ATL_JDBC_PASSWORD': this.database.options.password,
      'ATL_DB_TYPE': `${this.database.name}`,
    }
  };

  private getJVMArgs(): string {
    const JVM_SUPPORT_RECOMMENDED_ARGS = []
    if (this.options.debug) {
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dupm.plugin.upload.enabled=true');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Xdebug');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Xrunjdwp:transport=dt_socket,address=*:5005,server=y,suspend=n');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dcom.sun.management.jmxremote.port=9999');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dcom.sun.management.jmxremote.rmi.port=9998');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dcom.sun.management.jmxremote.authenticate=false');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dcom.sun.management.jmxremote.ssl=false');
    }

    if (this.options.quickReload) {
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dquickreload.dirs=/opt/quickreload');
    }

    return JVM_SUPPORT_RECOMMENDED_ARGS.join(' ');
  }

  private getVolumes() {
    return [
      ...this.options.quickReload ? [ `${this.options.quickReload}:/opt/quickreload` ] : ''
    ];
  }

}