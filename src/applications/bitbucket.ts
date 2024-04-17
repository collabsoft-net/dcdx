
import { timebomb } from '../helpers/licences';
import { toAbsolutePath } from '../helpers/toAbsolutePath';
import { ApplicationOptions } from '../types/ApplicationOptions';
import { DatabaseEngine } from '../types/DatabaseEngine';
import { Service } from '../types/DockerComposeV3';
import { SupportedApplications } from '../types/SupportedApplications';
import { Base } from './base';

export class Bitbucket extends Base {

  name = SupportedApplications.BITBUCKET;
  database: DatabaseEngine;
  logFilePath = '/var/atlassian/application-data/bitbucket/log/atlassian-bitbucket.log';

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
COPY ./quickreload-5.0.2.jar /var/atlassian/application-data/bitbucket/plugins/installed-plugins/quickreload-5.0.2.jar
COPY ./mysql-connector-j-8.3.0.jar /var/atlassian/application-data/bitbucket/lib/mysql-connector-j-8.3.0.jar
RUN echo "/opt/quickreload" > /var/atlassian/application-data/bitbucket/quickreload.properties; \
    mkdir -p /opt/quickreload; \
    chown -R bitbucket:bitbucket /opt/quickreload;

RUN mkdir -p /var/atlassian/application-data/bitbucket/shared; \
    touch /var/atlassian/application-data/bitbucket/shared/bitbucket.properties; \
    echo "setup.license=${this.options.license || timebomb.bitbucket}" >> /var/atlassian/application-data/bitbucket/shared/bitbucket.properties;

RUN chown -R bitbucket:bitbucket /var/atlassian/application-data/bitbucket`
      },
      ports: [
        `${this.options.port || 80}:7990`,
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
      ...this.options.debug ? { 'JVM_SUPPORT_RECOMMENDED_ARGS': this.getJVMArgs() } : '',
      'JDBC_URL': this.database.url,
      'JDBC_USER': this.database.options.username,
      'JDBC_PASSWORD': this.database.options.password,
      'JDBC_DRIVER': `${this.database.driver}`,
    }
  };

  private getJVMArgs(): string {
    const JVM_SUPPORT_RECOMMENDED_ARGS = []
    if (this.options.debug) {
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Dupm.plugin.upload.enabled=true');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-Xdebug');
      JVM_SUPPORT_RECOMMENDED_ARGS.push('-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005');
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