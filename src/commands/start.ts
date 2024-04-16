#!/usr/bin/env node

import { watch } from 'chokidar';
import { Option, program } from 'commander';
import { asyncExitHook, gracefulExit } from 'exit-hook';
import { cwd } from 'process';

import { AMPS } from '../applications/amps';
import { getApplicationByName } from '../helpers/getApplication';
import { isRecursiveBuild } from '../helpers/isRecursiveBuild';
import { showRecursiveBuildWarning } from '../helpers/showRecursiveBuildWarning';

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

const version = AMPS.getApplicationVersion();

(async () => {
  const options = program
    .name('dcdx start')
    .description('Build & install the Atlassian Data Center plugin from the current directory.\nYou can add Maven build arguments after the command options.')
    .usage('[options] [...maven_arguments]')
    .addOption(new Option('-v, --version <version>', 'The version of the host application').default(version))
    .addOption(new Option('-d, --database <name>', 'The database engine on which the host application will run').choices([ 'postgresql', 'mysql', 'mssql' ]).default('postgresql'))
    .addOption(new Option('-p, --port <port>', 'The HTTP port on which the host application will be accessible').default('80'))
    .addOption(new Option('-c, --contextPath <contextPath>', 'The context path on which the host application will be accessible'))
    .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
    .addOption(new Option('-o, --outputDirectory <arg>', 'Output directory where QuickReload will look for generated JAR files').default('target'))
    .addOption(new Option('--debug', 'Add support for JVM debugger on port 5005').default(true))
    .allowUnknownOption(true)
    .parse(process.argv)
    .opts();

  const instance = new Application({
    version: options.version,
    database: options.database,
    port: Number(options.port),
    contextPath: options.contextPath,
    debug: options.debug
  });

  const mavenOpts = program.args.slice();
  if (options.activateProfiles) {
    mavenOpts.push(...[ '-P', options.activateProfiles ]);
  }

  console.log('Watching filesystem for changes to source files (QuickReload)');
  let lastBuildCompleted = new Date().getTime();
  const quickReload = watch('**/*', {
    cwd: cwd(),
    usePolling: true,
    interval: 2 * 1000,
    binaryInterval: 2 * 1000,
    awaitWriteFinish: true
  }).on('change', async (path) => {
    if (path.startsWith(options.outputDirectory) && path.toLowerCase().endsWith('.jar')) {
      console.log('Found updated JAR file(s), uploading them to QuickReload');
      await instance.cp(path);
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

  asyncExitHook(async () => {
    console.log(`Stopping filesystem watcher... ⏳`);
    await quickReload.close();
    console.log(`Stopping ${instance.name}... ⏳`);
    await instance.stop();
    console.log(`Successfully stopped all running processes 💪`);
  }, { wait: 30 * 1000 });

  console.log('Starting application...');
  await instance.start();

})();

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit();
});

