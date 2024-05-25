
import { timebomb } from '../helpers/licences';
import { toAbsolutePath } from '../helpers/toAbsolutePath';
import { SupportedApplications, TApplicationOptions } from '../types/Application';
import { DatabaseEngine } from '../types/Database';
import { Service } from '../types/DockerComposeV3';
import { Base } from './base';

export class Bitbucket extends Base {

  name = SupportedApplications.Values.bitbucket;
  database: DatabaseEngine;
  logFilePath = '/var/atlassian/application-data/bitbucket/log/atlassian-bitbucket.log';

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
COPY ./quickreload-5.0.4.jar /var/atlassian/application-data/bitbucket/plugins/installed-plugins/quickreload-5.0.4.jar
COPY ./mysql-connector-j-8.3.0.jar /var/atlassian/application-data/bitbucket/lib/mysql-connector-j-8.3.0.jar
RUN echo "/opt/quickreload" > /var/atlassian/application-data/bitbucket/quickreload.properties; \
    mkdir -p /opt/quickreload; \
    chown -R bitbucket:bitbucket /opt/quickreload;

RUN mkdir -p /var/atlassian/application-data/bitbucket/shared; \
    touch /var/atlassian/application-data/bitbucket/shared/bitbucket.properties; \
    echo "setup.license=${timebomb.bitbucket}" >> /var/atlassian/application-data/bitbucket/shared/bitbucket.properties;

RUN chown -R bitbucket:bitbucket /var/atlassian/application-data/bitbucket`
      },
      ports: [
        `${this.options.port || 80}:7990`,
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


  // ------------------------------------------------------------------------------------------ Private Methods

  private getEnvironmentVariables() {
    return {
      ...this.options.xms ? { 'JVM_MINIMUM_MEMORY': this.options.xms } : '',
      ...this.options.xmx ? { 'JVM_MAXIMUM_MEMORY': this.options.xmx } : '',
      'JVM_SUPPORT_RECOMMENDED_ARGS': this.getJVMArgs().join(' '),
      'JDBC_URL': this.database.url,
      'JDBC_USER': this.database.options.username,
      'JDBC_PASSWORD': this.database.options.password,
      'JDBC_DRIVER': `${this.database.options.driver}`,
    }
  };

}