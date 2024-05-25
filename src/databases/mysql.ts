import { MySQLOptions, TMySQLOptions } from '../types/Database';
import { Service } from '../types/DockerComposeV3';
import { Base } from './base';

export class MySQL extends Base {

  public get url() {
    return `jdbc:mysql://db:${this.options.port}/${this.options.database}?sessionVariables=transaction_isolation='READ-COMMITTED'`;
  }

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(public options: TMySQLOptions = MySQLOptions.parse({})) {
    super(options);
  }

  // ------------------------------------------------------------------------------------------ Protected Methods

  protected async onDatabaseReady(): Promise<void> {
    await this.run(`ALTER DATABASE ${this.options.database} CHARACTER SET 'utf8mb4' COLLATE utf8mb4_bin`);
  }

  protected getService = (): Service => {
    return {
      image: `mysql:${this.options.tag}`,
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