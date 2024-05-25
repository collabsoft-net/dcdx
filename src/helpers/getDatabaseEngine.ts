import { MSSQL } from '../databases/mssql';
import { MySQL } from '../databases/mysql';
import { Postgres } from '../databases/postgres';
import { DatabaseEngine, MSSQLOptions, MySQLOptions, PostgreSQLOptions, SupportedDatabaseEngines, TDatabaseOptions } from '../types/Database';

export const getDatabaseEngine = (options: TDatabaseOptions): DatabaseEngine => {
  switch (options.name) {
    case SupportedDatabaseEngines.Values.postgresql:
      return new Postgres(PostgreSQLOptions.parse(options));

    case SupportedDatabaseEngines.Values.mysql:
      return new MySQL(MySQLOptions.parse(options));

    case SupportedDatabaseEngines.Values.mssql:
      return new MSSQL(MSSQLOptions.parse(options));

  }
}
