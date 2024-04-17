

export type DatabaseOptions = {
  port: number;
  database: string;
  username: string;
  password: string;
  clean?: boolean;
  prune?: boolean;
  logging?: boolean;
}