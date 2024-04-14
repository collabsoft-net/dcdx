import { DatabaseOptions } from '../types/DatabaseOptions';
import { Service } from '../types/DockerComposeV3';
import { SupportedDatabaseDrivers } from '../types/SupportedDatabaseDrivers';
import { SupportedDatabaseEngines } from '../types/SupportedDatabaseEngines';
import { Base } from './base';

type MySQLOptions = DatabaseOptions & {
  version: '8.0'|'8.3'
};

const defaultOptions: MySQLOptions = {
  port: 3306,
  database: 'dcdx',
  username: 'dcdx',
  password: 'dcdx',
  version: '8.0'
}


export class MySQL extends Base {
  name: SupportedDatabaseEngines = 'mysql';
  driver: SupportedDatabaseDrivers = 'com.mysql.jdbc.Driver';
  options: MySQLOptions = defaultOptions
  version: '8.0'|'8.3' = '8.0';

  public get url() {
    return `jdbc:mysql://db:${this.options.port}/${this.options.database}?sessionVariables=transaction_isolation='READ-COMMITTED'`;
  }

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(options: MySQLOptions = defaultOptions) {
    super({ ...defaultOptions, ...options });
  }

  // ------------------------------------------------------------------------------------------ Protected Methods

  protected async onDatabaseReady(): Promise<void> {
    await this.run(`ALTER DATABASE ${this.options.database} CHARACTER SET 'utf8mb4' COLLATE utf8mb4_bin`);
  }

  protected getService = (): Service => {
    return {
      image: `mysql:${this.version}`,
      ports: [ `${this.options.port || 3306}:3306` ],
      environment: {
        MYSQL_ROOT_PASSWORD: this.options.password || 'dcdx',
        MYSQL_USER: this.options.username || 'dcdx',
        MYSQL_PASSWORD: this.options.password || 'dcdx',
        MYSQL_DATABASE: this.options.database || 'dcdx'
      },
      command: ['--log_bin_trust_function_creators=1'],
      networks: {
        'shared': {
          aliases: [ 'db', 'database' ]
        }
      }
    }
  }

}