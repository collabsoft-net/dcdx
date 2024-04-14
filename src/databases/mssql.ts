import { DatabaseOptions } from '../types/DatabaseOptions';
import { Service } from '../types/DockerComposeV3';
import { SupportedDatabaseDrivers } from '../types/SupportedDatabaseDrivers';
import { SupportedDatabaseEngines } from '../types/SupportedDatabaseEngines';
import { Base } from './base';

export type MSSQLOptions = DatabaseOptions & {
  edition: 'Developer'|'Express'|'Standard'|'Enterprise'|'EnterpriseCore';
  version: '2017'|'2019'|'2022';
}

const defaultOptions: MSSQLOptions = {
  port: 1433,
  database: 'dcdx',
  username: 'sa',
  password: 'DataCenterDX!',
  edition: 'Developer',
  version: '2022'
};

export class MSSQL extends Base {
  name: SupportedDatabaseEngines = 'mssql';
  driver: SupportedDatabaseDrivers = 'com.microsoft.sqlserver.jdbc.SQLServerDriver';
  options: MSSQLOptions = defaultOptions;
  version: '2017'|'2019'|'2022' = '2022'

  public get url() {
    return `jdbc:sqlserver://db:${this.options.port};databaseName=${this.options.database};trustServerCertificate=true`;
  }

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(options: MSSQLOptions = defaultOptions) {
    super({ ...defaultOptions, ...options });
  }

  // ------------------------------------------------------------------------------------------ Protected Methods

  protected async onDatabaseReady() {
    await this.run(`CREATE DATABASE ${this.options.database}`);
    await this.run(`ALTER DATABASE ${this.options.database} COLLATE SQL_Latin1_General_CP1_CS_AS`);
    await this.run(`ALTER DATABASE ${this.options.database} SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;`);
  }

  protected getService = (): Service => {
    return {
      image: `mcr.microsoft.com/mssql/server:${this.version}-latest`,
      ports: [ `${this.options.port || 1433}:1433` ],
      environment: {
        ACCEPT_EULA: 'y',
        MSSQL_SA_PASSWORD: this.options.password || 'dcdx',
        MSSQL_PID: this.options.edition
      },
      networks: {
        'shared': {
          aliases: [ 'db', 'database' ]
        }
      }
    }
  }

}