import { dirname, join } from 'path';

export const toAbsolutePath = (relativePath: string) => {
  const [ , filePath ] = process.argv;
  const executableFileDir = dirname(filePath);
  const basedir = executableFileDir.substring(0, executableFileDir.indexOf('dcdx') + 4);
  return join(basedir, relativePath.replaceAll('../', ''));
}