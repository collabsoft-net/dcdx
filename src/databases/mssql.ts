import { MSSQLOptions, TMSSQLOptions } from '../types/Database';
import { Service } from '../types/DockerComposeV3';
import { Base } from './base';

export class MSSQL extends Base {

  public get url() {
    return `jdbc:sqlserver://db:${this.options.port};databaseName=${this.options.database};trustServerCertificate=true`;
  }

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(public options: TMSSQLOptions = MSSQLOptions.parse({})) {
    super(options);
  }

  // ------------------------------------------------------------------------------------------ Protected Methods

  protected async onDatabaseReady() {
    await this.run(`CREATE DATABASE ${this.options.database}`);
    await this.run(`ALTER DATABASE ${this.options.database} COLLATE SQL_Latin1_General_CP1_CS_AS`);
    await this.run(`ALTER DATABASE ${this.options.database} SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;`);
  }

  protected getService = (): Service => {
    return {
      image: `mcr.microsoft.com/mssql/server:${this.options.tag}`,
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