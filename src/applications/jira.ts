
import { timebomb } from '../helpers/licences';
import { toAbsolutePath } from '../helpers/toAbsolutePath';
import { SupportedApplications,TApplicationOptions } from '../types/Application';
import { DatabaseEngine } from '../types/Database';
import { Service } from '../types/DockerComposeV3';
import { Base } from './base';

export class Jira extends Base {

  name = SupportedApplications.Values.jira;
  database: DatabaseEngine;
  logFilePath = '/var/atlassian/application-data/jira/log/atlassian-jira.log';

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
COPY ./jira-data-generator-5.0.0.jar /var/atlassian/application-data/jira/plugins/installed-plugins/jira-data-generator-5.0.0.jar
COPY ./mysql-connector-j-8.3.0.jar /opt/atlassian/jira/lib/mysql-connector-j-8.3.0.jar
COPY ./quickreload-5.0.4.jar /var/atlassian/application-data/jira/plugins/installed-plugins/quickreload-5.0.4.jar
RUN echo "/opt/quickreload" > /var/atlassian/application-data/jira/quickreload.properties; \
    mkdir -p /opt/quickreload; \
    chown -R jira:jira /opt/quickreload;

RUN chown -R jira:jira /var/atlassian/application-data/jira`
      },
      ports: [
        `${this.options.port}:8080`,
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
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005');
    }
    return JVM_SUPPORT_RECOMMENDED_ARGS;
  }

  // ------------------------------------------------------------------------------------------ Private Methods

  private getEnvironmentVariables() {

    // For some reason, Jira uses a different type for postgres
    const dbType = this.database.options.name === 'postgresql' ? 'postgres72' : this.database.options.name;

    return {
      ...this.options.contextPath ? { 'ATL_TOMCAT_CONTEXTPATH': this.options.contextPath } : '',
      ...this.options.xms ? { 'JVM_MINIMUM_MEMORY': this.options.xms } : '',
      ...this.options.xmx ? { 'JVM_MAXIMUM_MEMORY': this.options.xmx } : '',
      'JVM_SUPPORT_RECOMMENDED_ARGS': this.getJVMArgs().join(' '),
      'ATL_LICENSE_KEY': timebomb.confluence,
      'ATL_JDBC_URL': this.database.url,
      'ATL_JDBC_USER': this.database.options.username,
      'ATL_JDBC_PASSWORD': this.database.options.password,
      'ATL_DB_DRIVER': this.database.options.driver,
      'ATL_DB_TYPE': dbType,
      'JIRA_SETUP_LICENSE': timebomb.jira
    }
  };

}