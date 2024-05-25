import { watch } from 'chokidar';
import { resolve as resolvePath } from 'path';
import { cwd } from 'process';

import { isRecursiveBuild } from '../helpers/isRecursiveBuild';
import { showRecursiveBuildWarning } from '../helpers/showRecursiveBuildWarning';
import { TBuildOptions } from '../types/AMPS';
import { TSupportedApplications } from '../types/Application';
import { AMPS } from './amps';
import * as Docker from './docker';

export const FileWatcher = (name: TSupportedApplications, options: TBuildOptions, mavenOpts: Array<string>) => {
  let lastBuildCompleted = new Date().getTime();
  const outputDirectory = options.outputDirectory || 'target';
  const patterns = options.ext || [ '**/*' ];
  console.log(`Watching filesystem for changes to source files (${patterns.join(', ')})`);

  const amps = new AMPS({
    cwd: options.cwd,
    profiles: options.activateProfiles?.split(',') || []
  });

  return watch(patterns, {
    cwd: options.cwd || cwd(),
    usePolling: true,
    interval: 2 * 1000,
    binaryInterval: 2 * 1000,
    awaitWriteFinish: true,
    persistent: true,
    atomic: true
  }).on('change', async (path) => {
    if (options.install && path.startsWith(outputDirectory) && path.toLowerCase().endsWith('.jar')) {
      const containerIds = await Docker.getRunningContainerIds(name);
      if (containerIds.length <= 0) {
        console.log(`There are no running instance of ${name}, unable to install plugin 🤔`);
        return;
      } else if (containerIds.length > 1) {
        console.log(`There are multple running instance of ${name}, unable to determine which one to use 🤔`);
        return;
      }

      const containerId = containerIds[0];
      if (containerId) {
        console.log(`Found updated JAR file, uploading them to QuickReload on running instances of ${name}`);
        await Docker.copy(resolvePath(path), `${containerId}:/opt/quickreload/`)
          .then(() => console.log('Finished uploading JAR file to QuickReload'))
          .catch(err => console.log('Failed to upload JAR file to QuickReload', err));
      }
    } else if (!path.startsWith(outputDirectory)) {
      if (isRecursiveBuild(lastBuildCompleted)) {
        showRecursiveBuildWarning(outputDirectory);
      } else {
        console.log('Detected file change, rebuilding Atlasian Data Center plugin');
        amps.build(mavenOpts).then(() => {
          console.log(`Finished building Atlassian Data Center plugin for ${name}... 💪`);
        }).catch(() => {
          console.log(`Failed to build Atlassian Data Center plugin for ${name}... 😰`);
        })
        lastBuildCompleted = new Date().getTime();
      }
    }
  });
}