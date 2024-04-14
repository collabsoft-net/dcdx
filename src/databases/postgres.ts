
import { DatabaseOptions } from '../types/DatabaseOptions';
import { Service } from '../types/DockerComposeV3';
import { SupportedDatabaseDrivers } from '../types/SupportedDatabaseDrivers';
import { SupportedDatabaseEngines } from '../types/SupportedDatabaseEngines';
import { Base } from './base';

type PostgresOptions = DatabaseOptions & {
  version?: '12'|'13'|'14'|'15';
}

const defaultOptions: PostgresOptions = {
  version: '15',
  database: 'dcdx',
  port: 5432,
  username: 'dcdx',
  password: 'dcdx'
};

export class Postgres extends Base {
  name: SupportedDatabaseEngines = 'postgresql';
  driver: SupportedDatabaseDrivers = 'org.postgresql.Driver';
  options: PostgresOptions = defaultOptions;
  version: string = '15';

  public get url() {
    return `jdbc:postgresql://db:${this.options.port}/${this.options.database}`;
  }

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(options: PostgresOptions = defaultOptions) {
    super({ ...defaultOptions, ...options });
  }

  // ------------------------------------------------------------------------------------------ Protected Methods

  protected getService = (): Service => {
    return {
      image: `postgres:${this.version}`,
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