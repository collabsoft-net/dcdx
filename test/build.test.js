import { cwd } from 'node:process';

import process, { stderr, stdout } from 'process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import versions from '../assets/versions.json';
import { SupportedApplications } from '../src/types/Application';
import { getValidLegacyPomFileFor, getValidPomFileFor } from './fixtures/pomFiles';

let stdOut = '';
let stdErr = '';

let commandExecutionOptions = '';
let fsWatcherPaths = '';
let fsWatcherOptions = null;
let fsWatcher = null;

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockRecursiveBuild = vi.fn();
const mockedBuild = vi.fn();
const mockFSWatcherAdd = vi.fn();
const mockedDockerRunningContainerIds = vi.fn();
const mockedDockerCopy = vi.fn();

const defaultWatchOptions = {
  cwd: cwd(),
  usePolling: true,
  interval: 2 * 1000,
  binaryInterval: 2 * 1000,
  awaitWriteFinish: true,
  persistent: true,
  atomic: true
}

beforeEach(() => {
  stdOut = '';
  stdErr = '';

  vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
  vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });
  vi.spyOn(process, 'on').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation(() => {});
  vi.mock('exit-hook');

  vi.doMock('node:fs', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      existsSync: mockExistsSync,
      readFileSync: mockReadFileSync
    }
  });

  vi.doMock('chokidar', async (importOriginal) => {
    const actual = await importOriginal();
    actual.FSWatcher.prototype.add = mockFSWatcherAdd;
    return {
      ...actual,
      watch: (paths, options) => {
        fsWatcherPaths = paths;
        fsWatcherOptions = options;
        fsWatcher = actual.watch(paths, { ...options, useFsEvents: false });
        return fsWatcher;
      }
    }
  });

  vi.doMock('../src/helpers/docker.ts', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      getRunningContainerIds: mockedDockerRunningContainerIds,
      copy: mockedDockerCopy
    }
  });

  mockedBuild.mockReturnValue(Promise.resolve());
  vi.doMock('../src/helpers/amps.ts', async (importOriginal) => {
    const actual = await importOriginal();
    actual.AMPS.prototype.build = mockedBuild;
    return actual;
  });

  vi.doMock('../src/helpers/isRecursiveBuild.ts', () => ({
    isRecursiveBuild: mockRecursiveBuild
  }));

  vi.doMock('../src/helpers/ActionHandler.ts', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      ActionHandler: (program, executor, options) => {
        commandExecutionOptions = options || program.opts();
        return actual.ActionHandler(program, executor, options);
      }
    }
  });
});

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  stdOut = '';
  stdErr = '';
  commandExecutionOptions = '';
  fsWatcher = null;
  fsWatcherPaths = '';
  fsWatcherOptions = null;
  process.argv = [ 'vitest', cwd() ];
})

Object.values(SupportedApplications.Values).forEach(name => {

  const tag = versions[name][Math.floor(Math.random()*versions[name].length)];

  describe(`dcdx build - ${name}`, async () => {

    /**
     * Building the plugin with default configuration
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin
     */
    it(`dcdx build`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));

      await import('../src/commands/build');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(0);
      expect(mockedBuild).toBeCalledTimes(1);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        watch: false
      });
    });

    /**
     * Use an active profile for Apache Maven
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin
     * based on the activated Apache Maven profile
     */
    it(`dcdx build -P active`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag, 'active'));

      process.argv = [ 'vitest', cwd(), '-P', 'active' ]
      await import('../src/commands/build');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(0);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledWith([ '-P', 'active' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        watch: false,
        activateProfiles: 'active'
      });
    });

    /**
     * Use a legacy Atlassian Maven Plugin Suite product plugin
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin
     * based on one of the legacy AMPS product plugins
     */
    it(`dcdx build (legacy AMPS plugin)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidLegacyPomFileFor(name, tag));

      await import('../src/commands/build');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(0);
      expect(mockedBuild).toBeCalledTimes(1);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        watch: false
      });
    });

    /**
     * Add a file system watcher
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin
     * and also start a file system watcher detecting changes
     */
    it(`dcdx build --watch (no change)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));

      process.argv = [ 'vitest', cwd(), '--watch' ];
      await import('../src/commands/build');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true
      });
    });

    /**
     * Trigger a rebuild by changing a source file
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It also triggers a second build due to a change in a source file
     */
    it(`dcdx build --watch (change triggerd to src/somefile.java)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);

      process.argv = [ 'vitest', cwd(), '--watch' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'src/somefile.java');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(2);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
Detected file change, rebuilding Atlasian Data Center plugin
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true
      });
    });

    /**
     * Warn the user for recursive builds due to repetitive change detection
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It also warns the user for a recursive build due to repetitive changes
     * This could be due to incorrect outputDirectory configuration or IDE settings
     */
    it(`dcdx build --watch (repetitive change triggerd to src/somefile.java)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));

      process.argv = [ 'vitest', cwd(), '--watch' ];
      await import('../src/commands/build');

      mockRecursiveBuild.mockReturnValue(false);
      fsWatcher.emit('change', 'src/somefile.java');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      mockRecursiveBuild.mockReturnValue(true);
      fsWatcher.emit('change', 'src/somefile.java');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(2);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
Detected file change, rebuilding Atlasian Data Center plugin
Finished building Atlassian Data Center plugin for ${name}... 💪

===============================================================================================================
Recursive build trigger detected. The last build completed last than 5 seconds ago
This may indicate that the build changes files outside of the output directory
Alternatively, Maven is using a different output directory than configured:
'target'

Please make sure to check your build process and/or specify a different output directory using the '-o' option
===============================================================================================================
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true
      });
    });

    /**
     * Build the plugin and ignore the file change in the output directory
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It ignores the file change in the output directory because it isn't a JAR file
     */
    it(`dcdx build --watch (change triggerd in output directory)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);

      process.argv = [ 'vitest', cwd(), '--watch' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'target/somefile.class');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true
      });
    });

    /**
     * Build the plugin and ignore the JAR in the output directory
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It ignores the JAR in the output directory because the --install flag is missing
     */
    it(`dcdx build --watch (change triggerd by JAR file, without -i)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);

      process.argv = [ 'vitest', cwd(), '--watch' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'target/archive.jar');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true
      });
    });

    /**
     * Build the plugin and try to install the plugin, but fail due to no running application
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It tries to install the JAR file, but fails because there is no running container
     */
    it(`dcdx build --watch --install (change triggerd by JAR file, with -i but without containers)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([]);

      process.argv = [ 'vitest', cwd(), '--watch', '-i' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'target/archive.jar');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedDockerRunningContainerIds).toBeCalledTimes(1);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
There are no running instance of ${name}, unable to install plugin 🤔
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        install: true
      });
    });

    /**
     * Build the plugin and try to install the plugin, but fail due to multiple running application
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It tries to install the JAR file, but fails because there are multiple running containers
     */
    it(`dcdx build --watch --install (change triggerd by JAR file, with -i with multiple containers)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([ 'a', 'b' ]);

      process.argv = [ 'vitest', cwd(), '--watch', '-i' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'target/archive.jar');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedDockerRunningContainerIds).toBeCalledTimes(1);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
There are multple running instance of ${name}, unable to determine which one to use 🤔
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        install: true
      });
    });

    /**
     * Build the plugin and install the plugin
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It installs the JAR file into the running container
     */
    it(`dcdx build --watch --install (change triggerd by JAR file, with -i and a running instance)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([ 'a' ]);
      mockedDockerCopy.mockReturnValue(Promise.resolve());

      process.argv = [ 'vitest', cwd(), '--watch', '-i' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'target/archive.jar');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedDockerRunningContainerIds).toBeCalledTimes(1);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
Found updated JAR file, uploading them to QuickReload on running instances of ${name}
Finished uploading JAR file to QuickReload
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        install: true
      });
    });

    /**
     * Build the plugin and detect changes in 'target' because of alternative output directory
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It detects a change to a file in 'target' because of an alternative output directory
     */
    it(`dcdx build --watch --install --outputDirectory dist (change triggerd by JAR file, in different output directory)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([ 'a' ]);
      mockedDockerCopy.mockReturnValue(Promise.resolve());

      process.argv = [ 'vitest', cwd(), '--watch', '-i', '--outputDirectory', 'dist' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'target/someFile.java');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(2);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedDockerRunningContainerIds).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
Detected file change, rebuilding Atlasian Data Center plugin
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        install: true,
        outputDirectory: 'dist'
      });
    });

    /**
     * Build the plugin and install the JAR from an alternative output directory
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It detects a change to a JAR in an alternative output directory and installs it
     */
    it(`dcdx build --watch --install --outputDirectory dist (change triggerd by JAR file, with -i and a running container)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([ 'a' ]);
      mockedDockerCopy.mockReturnValue(Promise.resolve());

      process.argv = [ 'vitest', cwd(), '--watch', '-i', '--outputDirectory', 'dist' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'dist/archive.jar');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedDockerRunningContainerIds).toBeCalledTimes(1);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
Found updated JAR file, uploading them to QuickReload on running instances of ${name}
Finished uploading JAR file to QuickReload
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        install: true,
        outputDirectory: 'dist'
      });
    });

    /**
     * Build the plugin and watch for a specific extension
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It listens to file changes to a specific extension
     */
    it(`dcdx build --watch --ext **/*.java (no change)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));

      process.argv = [ 'vitest', cwd(), '--watch', '--ext', '**/*.java' ];
      await import('../src/commands/build');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        ext: [ '**/*.java' ]
      });
    });

    /**
     * Build the plugin and rebuild because a change in a file with a specific extension
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It listens to file changes to a specific extension and rebuilds the plugin
     * because a file with such extension was changed
     */
    it(`dcdx build --watch --ext **/*.java (change triggerd to src/somefile.java)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);

      process.argv = [ 'vitest', cwd(), '--watch', '--ext', '**/*.java' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'src/somefile.java');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(2);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
Detected file change, rebuilding Atlasian Data Center plugin
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        ext: [ '**/*.java' ]
      });
    });

    /**
     * Build the plugin and ignore a change in a file that does not match the specific extension
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It listens to file changes to a specific extension and ignores changes to files
     * that do not have the specified extension
     */
    it(`dcdx build --watch --ext **/*.java (change triggerd to src/somefile.txt - ignored)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);

      process.argv = [ 'vitest', cwd(), '--watch', '--ext', '**/*.java' ];
      await import('../src/commands/build');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        ext: [ '**/*.java' ]
      });
    });

    /**
     * Build the plugin and warn for recursive build due to multiple changes to a file with the specific extension
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It also warns the user for a recursive build due to repetitive changes to files with the specified extension
     * This could be due to incorrect outputDirectory configuration or IDE settings
     */
    it(`dcdx build --watch --ext **/*.java (repetitive change triggerd to src/somefile.java)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));

      process.argv = [ 'vitest', cwd(), '--watch', '--ext', '**/*.java' ];
      await import('../src/commands/build');

      mockRecursiveBuild.mockReturnValue(false);
      fsWatcher.emit('change', 'src/somefile.java');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      mockRecursiveBuild.mockReturnValue(true);
      fsWatcher.emit('change', 'src/somefile.java');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(2);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
Detected file change, rebuilding Atlasian Data Center plugin
Finished building Atlassian Data Center plugin for ${name}... 💪

===============================================================================================================
Recursive build trigger detected. The last build completed last than 5 seconds ago
This may indicate that the build changes files outside of the output directory
Alternatively, Maven is using a different output directory than configured:
'target'

Please make sure to check your build process and/or specify a different output directory using the '-o' option
===============================================================================================================
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        ext: [ '**/*.java' ]
      });
    });

    /**
     * Build the plugin and ignore changes to a file without the specified extension,
     * even if it is triggered in the 'target' directory with an alternative output directory
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It will ignore the file change to a file in the 'target' directory, even though an
     * alternative output directory was specified, because the file does not have the
     * correct file extension
     */
    it(`dcdx build --watch --ext **/*.java (change triggerd in output directory)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);

      process.argv = [ 'vitest', cwd(), '--watch', '--ext', '**/*.java' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'target/somefile.class');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        ext: [ '**/*.java' ]
      });
    });

    /**
     * Build the plugin and ignore the JAR in the output directory
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It ignores the JAR in the output directory because the --install flag is missing
     */
    it(`dcdx build --watch --ext **/*.java (change triggerd by JAR file, without -i)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);

      process.argv = [ 'vitest', cwd(), '--watch', '--ext', '**/*.java' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'target/archive.jar');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        ext: [ '**/*.java' ]
      });
    });

    /**
     * Build the plugin and try to install the plugin, but fail due to no running application
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It tries to install the JAR file, but fails because there is no running container
     */
    it(`dcdx build --watch --ext **/*.java -i (change triggerd by JAR file, with -i but without containers)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([]);

      process.argv = [ 'vitest', cwd(), '--watch', '--ext', '**/*.java', '-i' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'target/archive.jar');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);
      expect(mockedDockerRunningContainerIds).toBeCalledTimes(1);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
There are no running instance of ${name}, unable to install plugin 🤔
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        install: true,
        ext: [ '**/*.java' ]
      });
    });

    /**
     * Build the plugin and try to install the plugin, but fail due to multiple running application
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It tries to install the JAR file, but fails because there are multiple running containers
     */
    it(`dcdx build --watch --ext **/*.java -i (change triggerd by JAR file, with -i with multiple containers)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([ 'a', 'b' ]);

      process.argv = [ 'vitest', cwd(), '--watch', '--ext', '**/*.java', '-i' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'target/archive.jar');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);
      expect(mockedDockerRunningContainerIds).toBeCalledTimes(1);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
There are multple running instance of ${name}, unable to determine which one to use 🤔
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        install: true,
        ext: [ '**/*.java' ]
      });
    });

    /**
     * Build the plugin and install the plugin
     *
     * This will use the AMPS configuration found in the directory
     * to succesfully build the Atlassian Data Center plugin.
     * It installs the JAR file into the running container
     */
    it(`dcdx build --watch --ext **/*.java -i (change triggerd by JAR file, with -i and a running instance)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([ 'a' ]);
      mockedDockerCopy.mockReturnValue(Promise.resolve());

      process.argv = [ 'vitest', cwd(), '--watch', '--ext', '**/*.java', '-i' ];
      await import('../src/commands/build');

      fsWatcher.emit('change', 'target/archive.jar');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);
      expect(mockedDockerRunningContainerIds).toBeCalledTimes(1);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
Found updated JAR file, uploading them to QuickReload on running instances of ${name}
Finished uploading JAR file to QuickReload
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true,
        install: true,
        ext: [ '**/*.java' ]
      });
    });

    /**
     * Fail to build the plugin because an invalid argument was provided (--ext)
     *
     * The command will fail before building the application because the --ext
     * argument is invalid without --watch enabled as well
     */
    it(`dcdx build --ext **/*.java`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));

      process.argv = [ 'vitest', cwd(), '--ext', '**/*.java' ];
      await import('../src/commands/build');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockFSWatcherAdd).toBeCalledTimes(0);

      expect(stdErr).toContain('InvalidArgumentError: Invalid argument "--ext"');
      expect(stdOut).toBe('Successfully stopped all running processes 💪'.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual('');
      expect(fsWatcherOptions).toStrictEqual(null);
      expect(commandExecutionOptions).toStrictEqual({
        watch: false,
        ext: [ '**/*.java' ]
      });
    });

    /**
     * Fail to build the plugin because an invalid argument was provided (--install)
     *
     * The command will fail before building the application because the --install
     * argument is invalid without --watch enabled as well
     */
    it(`dcdx build --install`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));

      process.argv = [ 'vitest', cwd(), '--install' ];
      await import('../src/commands/build');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockFSWatcherAdd).toBeCalledTimes(0);

      expect(stdErr).toContain('InvalidArgumentError: Invalid argument "--install"');
      expect(stdOut).toBe('Successfully stopped all running processes 💪'.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual('');
      expect(fsWatcherOptions).toStrictEqual(null);
      expect(commandExecutionOptions).toStrictEqual({
        watch: false,
        install: true
      });
    });

    /**
     * Fail to build the plugin because an invalid argument was provided (--outputDirectory)
     *
     * The command will fail before building the application because the --outputDirectory
     * argument is invalid without --watch enabled as well
     */
    it(`dcdx build --outputDirectory dist`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));

      process.argv = [ 'vitest', cwd(), '--outputDirectory', 'dist' ];
      await import('../src/commands/build');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockFSWatcherAdd).toBeCalledTimes(0);

      expect(stdErr).toContain('InvalidArgumentError: Invalid argument "--outputDirectory"');
      expect(stdOut).toBe('Successfully stopped all running processes 💪'.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual('');
      expect(fsWatcherOptions).toStrictEqual(null);
      expect(commandExecutionOptions).toStrictEqual({
        watch: false,
        outputDirectory: 'dist'
      });
    });

    /**
     * Fail to build the plugin because an invalid argument was provided (--cwd)
     *
     * The command will fail before building the application because the --cwd
     * argument is invalid without --watch enabled as well
     */
    it(`dcdx build --cwd path/to/someDirectory`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));

      process.argv = [ 'vitest', cwd(), '--cwd', 'path/to/someDirectory' ];
      await import('../src/commands/build');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(0);

      expect(stdErr).toContain('');
      expect(stdOut).toBe(`
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual('');
      expect(fsWatcherOptions).toStrictEqual(null);
      expect(commandExecutionOptions).toStrictEqual({
        watch: false,
        cwd: 'path/to/someDirectory'
      });
    });

    /**
     * Fail to build the plugin because of Apache Maven error
     *
     * The command will fail because of an error in Apache Maven
     * This does not include further information in the test
     * but should normally display Maven errors in the console
     */
    it(`dcdx build (failed)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedBuild.mockRejectedValue(null);

      await import('../src/commands/build');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(0);
      expect(mockedBuild).toBeCalledTimes(1);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Building Atlassian Data Center plugin for ${name}... 💃
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        watch: false
      });
    });

    /**
     * Fail to build the plugin because of Apache Maven error
     *
     * The command will fail because of an error in Apache Maven
     * This does not include further information in the test
     * but should normally display Maven errors in the console
     */
    it(`dcdx build --watch (failed)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedBuild.mockRejectedValue(null);

      process.argv = [ 'vitest', cwd(), '--watch' ];
      await import('../src/commands/build');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Building Atlassian Data Center plugin for ${name}... 💃
Stopping filesystem watcher... ⏳
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true
      });
    });

    /**
     * Fail to rebuild the plugin because of Apache Maven error
     *
     * Succcesfully build the plugin on start, but fail the
     * rebuild triggered by a file change.
     * This does not include further information in the test
     * but should normally display Maven errors in the console
     */
    it(`dcdx build --watch (change triggerd to src/somefile.java, build failed)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);

      process.argv = [ 'vitest', cwd(), '--watch' ];
      await import('../src/commands/build');

      mockedBuild.mockRejectedValue(null);
      fsWatcher.emit('change', 'src/somefile.java');
      // This is important, because the async/await
      // in the change event handler is pushed to the next tick
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(2);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Building Atlassian Data Center plugin for ${name}... 💃
Finished building Atlassian Data Center plugin for ${name}... 💪
Detected file change, rebuilding Atlasian Data Center plugin
Failed to build Atlassian Data Center plugin for ${name}... 😰
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        watch: true
      });
    });

  });
});