import { watch } from 'chokidar';
import { cwd } from 'process';

import { isRecursiveBuild } from '../helpers/isRecursiveBuild';
import { showRecursiveBuildWarning } from '../helpers/showRecursiveBuildWarning';
import { TBuildOptions, TDebugOptions } from '../types/AMPS';
import { TSupportedApplications } from '../types/Application';
import { AMPS } from './amps';
import { CustomBuilder } from './CustomBuilder';
import { Installer } from './Installer';

export const FileWatcher = (name: TSupportedApplications, options: TBuildOptions|TDebugOptions, mavenOpts: Array<string>, installOnly: boolean = false) => {
  let lastBuildCompleted = new Date().getTime();
  const outputDirectory = options.outputDirectory || 'target';
  const patterns = options.ext || [ '**/*' ];
  console.log(`Watching filesystem for changes to source files (${patterns.join(', ')})`);

  const amps = new AMPS({
    cwd: options.cwd,
    profiles: options.activateProfiles?.split(',') || []
  });

  const deliverableExtension = options.obr ? '.obr' : '.jar';

  return watch(patterns, {
    cwd: options.cwd || cwd(),
    usePolling: true,
    interval: 2 * 1000,
    binaryInterval: 2 * 1000,
    awaitWriteFinish: true,
    persistent: true,
    atomic: true
  }).on('change', async (path) => {
    if (options.install && path.startsWith(outputDirectory) && path.toLowerCase().endsWith(deliverableExtension)) {
      await Installer(name, path, options);
    } else if (!path.startsWith(outputDirectory) && !installOnly) {
      if (isRecursiveBuild(lastBuildCompleted)) {
        showRecursiveBuildWarning(outputDirectory);
      } else {
        console.log('Detected file change, rebuilding Atlasian Data Center plugin');
        if (!options.exec) {
          await amps.build(mavenOpts).then(() => {
            console.log(`Finished building Atlassian Data Center plugin for ${name}... 💪`);
          }).catch(() => {
            console.log(`Failed to build Atlassian Data Center plugin for ${name}... 😰`);
          })
        } else {
          const builder = new CustomBuilder({ cmd: options.exec, cwd: options.cwd || cwd() });
          await builder.build().then(() => {
            console.log(`Finished building Atlassian Data Center plugin for ${name}... 💪`);
          }).catch(() => {
            console.log(`Failed to build Atlassian Data Center plugin for ${name}... 😰`);
          });
        }
        lastBuildCompleted = new Date().getTime();
      }
    }
  });
}