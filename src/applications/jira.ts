
import { getFullPath } from '../helpers/assets';
import { timebomb } from '../helpers/licences';
import { ApplicationOptions } from '../types/ApplicationOptions';
import { DatabaseEngine } from '../types/DatabaseEngine';
import { Service } from '../types/DockerComposeV3';
import { SupportedApplications } from '../types/SupportedApplications';
import { Base } from './base';

export class Jira extends Base {

  name: SupportedApplications = 'jira';
  database: DatabaseEngine;
  logFilePath = '/var/atlassian/application-data/jira/log/atlassian-jira.log';

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
        context: getFullPath('../../assets'),
        dockerfile_inline: `
FROM dcdx/${this.name}:${this.options.version}
COPY ./jira-data-generator-5.0.0.jar /var/atlassian/application-data/jira/plugins/installed-plugins/jira-data-generator-5.0.0.jar
COPY ./quickreload-5.0.2.jar /var/atlassian/application-data/jira/plugins/installed-plugins/quickreload-5.0.2.jar
COPY ./mysql-connector-j-8.3.0.jar /opt/atlassian/jira/lib/mysql-connector-j-8.3.0.jar
RUN chown -R jira:jira /var/atlassian/application-data/jira`
      },
      ports: [
        `${this.options.port || 80}:8080`,
        ...this.options.debug ? [ '5005:5005' ] : [],
      ],
      environment: Object.keys(environment).length > 0 ? environment : undefined,
      volumes: volumes.length > 0 ? volumes : undefined,
      networks: [ 'shared' ]
    }
  }

  // ------------------------------------------------------------------------------------------ Private Methods

  private getEnvironmentVariables() {

    // For some reason, Jira uses a different type for postgres
    const dbType = this.database.name === 'postgresql' ? 'postgres72' : this.database.name;

    return {
      ...this.options.contextPath ? { 'ATL_TOMCAT_CONTEXTPATH': this.options.contextPath } : '',
      ...this.options.debug ? { 'JVM_SUPPORT_RECOMMENDED_ARGS': this.getJVMArgs() } : '',
      'ATL_LICENSE_KEY': this.options.license || timebomb.confluence,
      'ATL_JDBC_URL': this.database.url,
      'ATL_JDBC_USER': this.database.options.username,
      'ATL_JDBC_PASSWORD': this.database.options.password,
      'ATL_DB_DRIVER': this.database.driver,
      'ATL_DB_TYPE': dbType,
      'JIRA_SETUP_LICENSE': this.options.license || timebomb.jira
    }
  };

  private getJVMArgs(): string {
    const JVM_SUPPORT_RECOMMENDED_ARGS = []
    if (this.options.debug) {

      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dupm.plugin.upload.enabled=true');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Xdebug');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005');
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