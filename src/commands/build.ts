#!/usr/bin/env node

import { watch } from 'chokidar';
import { Option, program } from 'commander';
import { asyncExitHook, gracefulExit } from 'exit-hook';
import { resolve } from 'path';
import { cwd } from 'process';

import { AMPS } from '../helpers/amps';
import { Docker } from '../helpers/docker';
import { getApplicationByName } from '../helpers/getApplication';
import { isRecursiveBuild } from '../helpers/isRecursiveBuild';
import { showRecursiveBuildWarning } from '../helpers/showRecursiveBuildWarning';

(async () => {
  const options = program
    .name('dcdx build')
    .description('Build & install the Atlassian Data Center plugin from the current directory.\nYou can add Maven build arguments after the command options.')
    .usage('[options] [...maven_arguments]')
    .addOption(new Option('-w, --watch <patterns...>', 'Additional list of glob patterns used to watch for file changes'))
    .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
    .addOption(new Option('-o, --outputDirectory <directory>', 'Output directory where QuickReload will look for generated JAR files').default('target'))
    .allowUnknownOption(true)
    .parse(process.argv)
    .opts();

  if (!AMPS.isAtlassianPlugin()) {
    console.log('Unable to find an Atlassian Plugin project in the current directory 🤔');
    gracefulExit();
  }

  const application = AMPS.getApplication();
  if (!application) {
    console.log('The Atlassian Plugin project does not contain an AMPS configuration, unable to detect product 😰');
    gracefulExit();
    process.exit();
  }

  const Application = getApplicationByName(application);
  if (!Application) {
    console.log('The Atlassian Plugin project does not contain an AMPS configuration, unable to detect product 😰');
    process.exit();
  }

  const mavenOpts = program.args.slice();
  if (options.activateProfiles) {
    mavenOpts.push(...[ '-P', options.activateProfiles ]);
  }

  console.log(`Looking for running instances of ${application}`);
  const containerIds = await Docker.getRunningContainerIds(application);
  if (containerIds.length > 1) {
    console.log(`There are multple running instance of ${application}, unable to determine which one to use`);
    gracefulExit(0);
    return;
  }

  const containerId = containerIds[0];
  if (!containerId) {
    console.log(`Could not find running instance of ${application}, please make sure they are running first!`);
    gracefulExit(0);
    return;
  }

  console.log('Watching filesystem for changes to source files (QuickReload)');
  let lastBuildCompleted = new Date().getTime();
  const patterns = Array.isArray(options.watch) ? options.watch : [ options.watch ];
  const quickReload = watch([ '**/*', ...patterns ], {
    cwd: cwd(),
    usePolling: true,
    interval: 2 * 1000,
    binaryInterval: 2 * 1000,
    awaitWriteFinish: true,
    persistent: true,
    atomic: true
  });

  asyncExitHook(async () => {
    console.log(`Stopping filesystem watcher... ⏳`);
    await quickReload.close();
    console.log(`Successfully stopped all running processes 💪`);
  }, { wait: 30 * 1000 });

  quickReload.on('change', async (path) => {
    if (path.startsWith(options.outputDirectory) && path.toLowerCase().endsWith('.jar')) {
      console.log('Found updated JAR file, uploading them to QuickReload');
      await Docker.copy(resolve(path), `${containerId}:/opt/quickreload/`)
        .then(() => console.log('Finished uploading JAR file to QuickReload'))
        .catch(err => console.log('Failed to upload JAR file to QuickReload', err));
      lastBuildCompleted = new Date().getTime();
    } else if (!path.startsWith(options.outputDirectory)) {
      if (isRecursiveBuild(lastBuildCompleted)) {
        showRecursiveBuildWarning(options.outputDirectory);
      } else {
        console.log('Detected file change, rebuilding Atlasian Plugin for QuickReload');
        await AMPS.build(mavenOpts).catch(() => Promise.resolve());
      }
    }
  });

  await AMPS.build(mavenOpts).catch(() => Promise.resolve());
  lastBuildCompleted = new Date().getTime();
})();

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit();
});

