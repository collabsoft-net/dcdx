import { readFileSync } from 'fs';

export const readLinesInFile = (path: string, callback: (line: string) => void) => {
  const contents = readFileSync(path, 'utf-8');
  const lines = contents.split('\n');
  lines.forEach(callback);
}
