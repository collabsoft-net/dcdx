
import { PostgreSQLOptions, TPostgreSQLOptions } from '../types/Database';
import { Service } from '../types/DockerComposeV3';
import { Base } from './base';

export class Postgres extends Base {

  public get url() {
    return `jdbc:postgresql://db:${this.options.port}/${this.options.database}`;
  }

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(public options: TPostgreSQLOptions = PostgreSQLOptions.parse({})) {
    super(options);
  }

  // ------------------------------------------------------------------------------------------ Protected Methods

  protected getService = (): Service => {
    return {
      image: `postgres:${this.options.tag}`,
      ports: [ `${this.options.port || 5432}:5432` ],
      environment: {
        POSTGRES_USER: this.options.username || 'dcdx',
        POSTGRES_PASSWORD: this.options.password || 'dcdx',
        POSTGRES_DB: this.options.database || 'dcdx',
        POSTGRES_HOST_AUTH_METHOD: 'md5',
        POSTGRES_INITDB_ARGS: '--encoding=UTF-8 --lc-collate=C --lc-ctype=C'
      },
      networks: {
        'shared': {
          aliases: [ 'db', 'database' ]
        }
      }
    }
  }
}