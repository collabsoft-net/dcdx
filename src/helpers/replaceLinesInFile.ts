import { readFileSync, writeFileSync } from 'fs'

export const replaceLinesInFile = (path: string, replacer: (line: string) => string) => {
  const contents = readFileSync(path, 'utf-8');
  const lines = contents.split('\n');
  const result = lines.map(replacer);
  writeFileSync(path, result.join('\n'), 'utf-8');
}