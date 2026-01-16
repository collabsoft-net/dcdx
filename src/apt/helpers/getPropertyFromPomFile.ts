import { exec } from 'child_process'

export const getPropertyFromPomFile = async (path: string, expression: string, activateProfiles?: string) => {
  const extraArgs: Array<string> = [];

  if (activateProfiles) {
    extraArgs.push(`-P ${activateProfiles}`);
  }

  return new Promise<string|undefined>(resolve =>
    exec(`mvn -f ${path} ${extraArgs.join(' ')} help:evaluate -Dexpression=${expression} -q -DforceStdout`, (err, stdout) => {
      if (err) {
        resolve(undefined);
      } else {
        const lines = stdout.split('\n');
        resolve(lines.pop());
      }
    })
  );
}
