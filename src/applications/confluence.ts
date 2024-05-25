
import { timebomb } from '../helpers/licences';
import { toAbsolutePath } from '../helpers/toAbsolutePath';
import { SupportedApplications,TApplicationOptions } from '../types/Application';
import { DatabaseEngine } from '../types/Database';
import { Service } from '../types/DockerComposeV3';
import { Base } from './base';

export class Confluence extends Base {

  name = SupportedApplications.Values.confluence;
  database: DatabaseEngine;
  logFilePath = '/var/atlassian/application-data/confluence/logs/atlassian-confluence.log';

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
COPY ./mysql-connector-j-8.3.0.jar /opt/atlassian/confluence/confluence/WEB-INF/lib/mysql-connector-j-8.3.0.jar
COPY ./quickreload-5.0.4.jar /opt/atlassian/confluence/confluence/WEB-INF/atlassian-bundled-plugins/quickreload-5.0.4.jar
RUN echo "/opt/quickreload" > /var/atlassian/application-data/confluence/quickreload.properties; \
    mkdir -p /opt/quickreload; \
    chown -R confluence:confluence /opt/quickreload;

RUN chown -R confluence:confluence /opt/atlassian/confluence`
      },
      ports: [
        `${this.options.port || 80}:8090`,
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
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Xrunjdwp:transport=dt_socket,address=*:5005,server=y,suspend=n');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dcom.sun.management.jmxremote.port=9999');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dcom.sun.management.jmxremote.rmi.port=9998');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dcom.sun.management.jmxremote.authenticate=false');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dcom.sun.management.jmxremote.ssl=false');
    }
    return JVM_SUPPORT_RECOMMENDED_ARGS;
  }

  // ------------------------------------------------------------------------------------------ Private Methods

  private getEnvironmentVariables() {
    return {
      ...this.options.contextPath ? { 'ATL_TOMCAT_CONTEXTPATH': this.options.contextPath } : '',
      ...this.options.xms ? { 'JVM_MINIMUM_MEMORY': this.options.xms } : '',
      ...this.options.xmx ? { 'JVM_MAXIMUM_MEMORY': this.options.xmx } : '',
      'JVM_SUPPORT_RECOMMENDED_ARGS': this.getJVMArgs().join(' '),
      'ATL_LICENSE_KEY': timebomb.confluence,
      'ATL_JDBC_URL': this.database.url,
      'ATL_JDBC_USER': this.database.options.username,
      'ATL_JDBC_PASSWORD': this.database.options.password,
      'ATL_DB_TYPE': `${this.database.options.name}`,
    }
  };

}