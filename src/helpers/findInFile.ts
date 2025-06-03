import { readFileSync } from 'fs'

export const findInFile = (path: string, value: string|Array<string>, caseSensitive: boolean = false): boolean => {
  const contents = readFileSync(path, 'utf-8');
  const lines = contents.split('\n');
  const values = Array.isArray(value) ? value : [ value ];
  return values.every(item => lines.find(line => caseSensitive ? line.toLowerCase().includes(item.toLowerCase()) : line.includes(item)) !== undefined);
}