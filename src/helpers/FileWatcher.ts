import { watch } from 'chokidar';
import { join } from 'path';
import { cwd } from 'process';

import { getAppLicense } from '../apt/helpers/getAppLicense';
import { isRecursiveBuild } from '../helpers/isRecursiveBuild';
import { showRecursiveBuildWarning } from '../helpers/showRecursiveBuildWarning';
import { TSupportedApplications } from '../types/Application';
import { TFileWatcherOptions } from '../types/FileWatcher';
import { AMPS } from './amps';
import { CustomBuilder } from './CustomBuilder';
import { installFromURL } from './installFromURL';
import { installWithQuickReload } from './installWithQuickReload';

export const FileWatcher = (name: TSupportedApplications, options: TFileWatcherOptions, mavenOpts: Array<string>, installOnly: boolean = false) => {
  let lastBuildStarted = new Date().getTime();
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
      if (deliverableExtension === '.obr') {
        await installFromURL({
          path: join(options.cwd || cwd(), path),
          baseUrl: options.baseUrl || 'http://localhost',
          username: options.username || 'admin',
          password: options.password || 'admin',
          license: await getAppLicense(undefined, true),
          verbose: true
        }).catch(() => console.log(`Failed to install Atlassian Data Center plugin for ${name}... 😰`));
      } else {
        await installWithQuickReload({
          path,
          product: name,
          baseUrl: options.baseUrl || 'http://localhost',
          username: options.username || 'admin',
          password: options.password || 'admin',
          license: await getAppLicense(undefined, true)
        }).catch(() => console.log(`Failed to install Atlassian Data Center plugin for ${name}... 😰`));
      }
    } else if (!path.startsWith(outputDirectory) && !installOnly) {
      if (isRecursiveBuild(lastBuildStarted)) {
        showRecursiveBuildWarning(outputDirectory);
      } else {
        lastBuildStarted = new Date().getTime();
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
      }
    }
  });
}