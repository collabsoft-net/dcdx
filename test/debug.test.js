import { setMaxListeners } from 'node:events';
import { cwd } from 'node:process';
import { EventEmitter } from 'node:stream';

import axios from 'axios';
import process, { stderr, stdout } from 'process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import versions from '../assets/versions.json';
import { SupportedApplications } from '../src/types/Application';
import { getValidLegacyPomFileFor, getValidPomFileFor } from './fixtures/pomFiles';
import { isBuildRequired } from './helpers/isBuildRequired';
import { mustSkip } from './helpers/mustSkip';

let stdOut = '';
let stdErr = '';

const SpawnEventEmitter = new EventEmitter();
let commandExecutionOptions = '';
let fsWatcherPaths = '';
let fsWatcherOptions = null;
let fsWatcher = null;
let fsWatcherEventListener = null;

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockRecursiveBuild = vi.fn();
const mockedBuild = vi.fn();
const mockFSWatcherAdd = vi.fn();
const mockedDockerRunningContainerIds = vi.fn();
const mockedDockerCopy = vi.fn();
const mockedClone = vi.fn();
const mockedPull = vi.fn();
const mockedSpawn = vi.fn().mockImplementation(() => SpawnEventEmitter);
const mockedDownAll = vi.fn();
const mockedPS = vi.fn();
const mockedStop = vi.fn();
const mockedUpAll = vi.fn();
const mockedAuthenticate = vi.fn();
const mockedQuery = vi.fn();

const defaultCommandOptions = {
  clean: false,
  database: 'postgresql',
  debug: true,
  port: '80',
  prune: false,
  watch: true,
  install: true,
  obr: false,
  xms: '1024m',
  xmx: '1024m',
}

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

  setMaxListeners(300);
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

  vi.doMock('node:child_process', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      spawn: mockedSpawn
    }
  });

  vi.doMock('sequelize', async (importOriginal) => {
    const actual = await importOriginal();
    actual.Sequelize.prototype.authenticate = mockedAuthenticate;
    actual.Sequelize.prototype.query = mockedQuery;
    return actual;
  });

  vi.doMock('docker-compose/dist/v2.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      downAll: mockedDownAll,
      ps: mockedPS,
      stop: mockedStop,
      upAll: mockedUpAll
    }
  });

  vi.mock('simple-git', () => ({
    default: vi.fn(() => ({
      pull: mockedPull,
      clone: mockedClone
    }))
  }));

  vi.doMock('chokidar', async (importOriginal) => {
    const actual = await importOriginal();
    actual.FSWatcher.prototype.add = mockFSWatcherAdd;
    return {
      ...actual,
      watch: (paths, options) => {
        fsWatcherPaths = paths;
        fsWatcherOptions = options;
        fsWatcher = actual.watch(paths, { ...options, useFsEvents: false });
        fsWatcher.on = (_, listener) => {
          fsWatcherEventListener = listener;
          return fsWatcher;
        }
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
        commandExecutionOptions = { ...(options || program.opts()) };
        return actual.ActionHandler(program, executor, options);
      }
    }
  });

  vi.doMock('../src/helpers/getVersions.ts', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      getVersions: () => versions
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
  fsWatcherEventListener = null;
  process.argv = [ 'vitest', cwd() ];
  setMaxListeners();
})

Object.values(SupportedApplications.Values).forEach(name => {

  const tag = isBuildRequired[name](false);

  describe.skipIf(mustSkip.includes('debug'))(`dcdx debug - ${name}`, async () => {

    it(`dcdx debug (build required - git clone)`, async () => {
      mockExistsSync.mockImplementation((path) => {
        if (path.endsWith('.xml')) {
          return true;
        } else {
          return false;
        }
      });
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, isBuildRequired[name](true)));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(1);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandOptions });
    });

    it(`dcdx debug (build required - git pull)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, isBuildRequired[name](true)));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(1);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandOptions });
    });

    it(`dcdx debug (build required - docker quits unexpected)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, isBuildRequired[name](true)));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 1);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(1);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(0);
      expect(mockedAuthenticate).toBeCalledTimes(0);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr.startsWith('Error: Docker exited with code 1')).toBeTruthy();
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandOptions });
    });

    it(`dcdx debug (fails to become available)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: name !== 'bamboo' ? 200 : 204,
        data: { status: 'FAILED' }
      })

      vi.useFakeTimers();

      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // Run all the timers
      await vi.runAllTimersAsync();
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      let counter = '';
      [...Array(121)].forEach((_, index) => counter += `Waiting for ${name} to become available... ${index}s\n`);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
${counter.trim()}
Could not confirm state of ${name}, but the container is running. Please consult the application logs 👇
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(123);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);
      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandOptions });
    });

    it(`dcdx debug (fails to become available - Axios error)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockRejectedValue({
        status: 500
      })

      vi.useFakeTimers();

      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // Run all the timers
      await vi.runAllTimersAsync();
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      let counter = '';
      [...Array(121)].forEach((_, index) => counter += `Waiting for ${name} to become available... ${index}s\n`);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
${counter.trim()}
Could not confirm state of ${name}, but the container is running. Please consult the application logs 👇
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(123);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);
      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandOptions });
    });

    it(`dcdx debug --tag latest`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--tag', 'latest' ]
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(4);
      expect(mockReadFileSync).toBeCalledTimes(4);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        tag: 'latest'
      });
    });

    it(`dcdx debug --tag invalid`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--tag', 'invalid' ]
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(4);
      expect(mockReadFileSync).toBeCalledTimes(4);
      expect(mockFSWatcherAdd).toBeCalledTimes(0);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(0);
      expect(mockedAuthenticate).toBeCalledTimes(0);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr.startsWith(`Error: Product version 'invalid' is invalid. Allowed choices are`)).toBeTruthy();
      expect(stdOut).toBe('Successfully stopped all running processes 💪'.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        tag: 'invalid'
      });
    });

    it(`dcdx debug --database mysql`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--database', 'mysql' ]
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(1);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of mysql... 💃
Database is ready and accepting connections on localhost:3306 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        database: 'mysql'
      });
    });

    it(`dcdx debug --database mssql`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--database', 'mssql' ]
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of mssql... 💃
Database is ready and accepting connections on localhost:1433 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        database: 'mssql'
      });
    });

    it(`dcdx debug --database invalid`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--database', 'invalid' ]
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(0);
      expect(mockReadFileSync).toBeCalledTimes(0);
      expect(mockFSWatcherAdd).toBeCalledTimes(0);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(0);
      expect(mockedAuthenticate).toBeCalledTimes(0);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr.startsWith(`error: option '-d, --database <name>' argument 'invalid' is invalid. Allowed choices are postgresql, mysql, mssql.`)).toBeTruthy();
      expect(stdOut).toBe('');
      expect(commandExecutionOptions).toBe('');
    });

    it(`dcdx debug --port 1234`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--port', '1234' ]
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:1234 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        port: '1234'
      });
    });

    it(`dcdx debug --contextPath atlassian`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '-c', 'atlassian' ]
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80/atlassian 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        contextPath: 'atlassian'
      });
    });

    it(`dcdx debug --xms 2gb`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--xms', '2gb' ]
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        xms: '2gb'
      });
    });

    it(`dcdx debug --xmx 2gb`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--xmx', '2gb' ]
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        xmx: '2gb'
      });
    });

    it(`dcdx debug --clean`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--clean' ]
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(2);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        clean: true
      });
    });

    it(`dcdx debug --prune`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--prune' ]
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(2);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        prune: true
      });
    });

    it(`dcdx debug -P active`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag, 'active'));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '-P', 'active' ]
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        activateProfiles: 'active'
      });
    });


    it(`dcdx debug (no change)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd() ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
      });
    });

    it(`dcdx debug (change triggerd to src/somefile.java)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd() ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      await fsWatcherEventListener('src/somefile.java');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Detected file change, rebuilding Atlasian Data Center plugin
Finished building Atlassian Data Center plugin for ${name}... 💪
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true
      });

    });

    it(`dcdx debug (repetitive change triggerd to src/somefile.java)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd() ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      mockRecursiveBuild.mockReturnValue(false);
      await fsWatcherEventListener('src/somefile.java');

      // Rapidly trigger another build based on a file change
      mockRecursiveBuild.mockReturnValue(true);
      await fsWatcherEventListener('src/somefile.java');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Detected file change, rebuilding Atlasian Data Center plugin
Finished building Atlassian Data Center plugin for ${name}... 💪

===============================================================================================================
Recursive build trigger detected. The last build completed last than 5 seconds ago
This may indicate that the build changes files outside of the output directory
Alternatively, Maven is using a different output directory than configured:
'target'

Please make sure to check your build process and/or specify a different output directory using the '-o' option
===============================================================================================================
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true
      });
    });

    it(`dcdx debug (change triggerd in output directory)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd() ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      await fsWatcherEventListener('target/somefile.class');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true
      });
    });

    it(`dcdx debug (change triggerd by JAR file, without containers)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([]);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd() ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      await fsWatcherEventListener('target/archive.jar');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
There are no running instance of ${name}, unable to install plugin 🤔
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        install: true
      });
    });

    it(`dcdx debug (change triggerd by JAR file, with multiple containers)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([ 'a', 'b' ]);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd() ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      await fsWatcherEventListener('target/archive.jar');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
There are multple running instance of ${name}, unable to determine which one to use 🤔
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        install: true
      });
    });

    it(`dcdx debug (change triggerd by JAR file, with a running instance)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([ 'a' ]);
      mockedDockerCopy.mockReturnValue(Promise.resolve());
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd() ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      await fsWatcherEventListener('target/archive.jar');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Found updated plugin, uploading it to QuickReload on running instances of ${name}
Finished uploading plugin archive to QuickReload
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        install: true
      });
    });

    it(`dcdx debug --outputDirectory dist (change triggerd by JAR file, in different output directory)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([ 'a' ]);
      mockedDockerCopy.mockReturnValue(Promise.resolve());
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--outputDirectory', 'dist' ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      await fsWatcherEventListener('target/archive.jar');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Detected file change, rebuilding Atlasian Data Center plugin
Finished building Atlassian Data Center plugin for ${name}... 💪
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        install: true,
        outputDirectory: 'dist'
      });
    });

    it(`dcdx debug --outputDirectory dist (change triggerd by JAR file, with a running container)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([ 'a' ]);
      mockedDockerCopy.mockReturnValue(Promise.resolve());
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--outputDirectory', 'dist' ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      await fsWatcherEventListener('dist/archive.jar');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Found updated plugin, uploading it to QuickReload on running instances of ${name}
Finished uploading plugin archive to QuickReload
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        install: true,
        outputDirectory: 'dist'
      });
    });

    it(`dcdx debug --ext **/*.java (no change)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--ext', '**/*.java' ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        ext: [ '**/*.java' ]
      });
    });

    it(`dcdx debug --ext **/*.java (change triggerd to src/somefile.java)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--ext', '**/*.java' ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      await fsWatcherEventListener('src/somefile.java');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Detected file change, rebuilding Atlasian Data Center plugin
Finished building Atlassian Data Center plugin for ${name}... 💪
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        ext: [ '**/*.java' ]
      });
    });

    it(`dcdx debug --ext **/*.java (change triggerd to src/somefile.txt - ignored)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--ext', '**/*.java' ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        ext: [ '**/*.java' ]
      });
    });

    it(`dcdx debug --ext **/*.java (repetitive change triggerd to src/somefile.java)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--ext', '**/*.java' ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      mockRecursiveBuild.mockReturnValue(false);
      await fsWatcherEventListener('src/somefile.java');

      // Trigger a build based on a file change
      mockRecursiveBuild.mockReturnValue(true);
      await fsWatcherEventListener('src/somefile.java');

      await new Promise((resolve) => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Detected file change, rebuilding Atlasian Data Center plugin
Finished building Atlassian Data Center plugin for ${name}... 💪

===============================================================================================================
Recursive build trigger detected. The last build completed last than 5 seconds ago
This may indicate that the build changes files outside of the output directory
Alternatively, Maven is using a different output directory than configured:
'target'

Please make sure to check your build process and/or specify a different output directory using the '-o' option
===============================================================================================================
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        ext: [ '**/*.java' ]
      });
    });

    it(`dcdx debug --ext **/*.java (change triggerd in output directory)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--ext', '**/*.java' ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      await fsWatcherEventListener('target/somefile.class');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        ext: [ '**/*.java' ]
      });
    });

    it(`dcdx debug --ext **/*.java (change triggerd by JAR file)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--ext', '**/*.java' ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      await fsWatcherEventListener('target/archive.jar');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));


      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Found updated plugin, uploading it to QuickReload on running instances of ${name}
Finished uploading plugin archive to QuickReload
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        ext: [ '**/*.java' ]
      });
    });

    it(`dcdx debug --ext **/*.java (change triggerd by JAR file, without containers)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([]);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--ext', '**/*.java' ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      await fsWatcherEventListener('target/archive.jar');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));


      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);
      expect(mockedDockerRunningContainerIds).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
There are no running instance of ${name}, unable to install plugin 🤔
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        install: true,
        ext: [ '**/*.java' ]
      });
    });

    it(`dcdx debug --ext **/*.java (change triggerd by JAR file, with multiple containers)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([ 'a', 'b' ]);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--ext', '**/*.java' ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      await fsWatcherEventListener('target/archive.jar');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);
      expect(mockedDockerRunningContainerIds).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
There are multple running instance of ${name}, unable to determine which one to use 🤔
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        install: true,
        ext: [ '**/*.java' ]
      });
    });

    it(`dcdx debug --ext **/*.java (change triggerd by JAR file, with a running instance)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedDockerRunningContainerIds.mockReturnValue([ 'a' ]);
      mockedDockerCopy.mockReturnValue(Promise.resolve());
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--ext', '**/*.java' ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      await fsWatcherEventListener('target/archive.jar');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*.java' ]);
      expect(mockedDockerRunningContainerIds).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*.java)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Found updated plugin, uploading it to QuickReload on running instances of ${name}
Finished uploading plugin archive to QuickReload
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*.java' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true,
        install: true,
        ext: [ '**/*.java' ]
      });
    });

    it(`dcdx debug (failed)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedBuild.mockRejectedValue(null);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual(defaultCommandOptions);
    });

    it(`dcdx debug (failed)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedBuild.mockRejectedValue(null);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd() ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true
      });
    });

    it(`dcdx debug (change triggerd to src/somefile.java, build failed)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockRecursiveBuild.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd() ];
      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));

      // Trigger a build based on a file change
      mockedBuild.mockRejectedValue(null);
      await fsWatcherEventListener('src/somefile.java');

      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockFSWatcherAdd).toHaveBeenCalledWith([ '**/*' ]);
      expect(mockedBuild).toBeCalledTimes(1);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Detected file change, rebuilding Atlasian Data Center plugin
Failed to build Atlassian Data Center plugin for ${name}... 😰
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(fsWatcherPaths).toStrictEqual([ '**/*' ]);
      expect(fsWatcherOptions).toStrictEqual(defaultWatchOptions);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        watch: true
      });
    });

    it(`dcdx debug (legacy AMPS plugin)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidLegacyPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name: `test-with-dashes-in-${name}-1`, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      await import('../src/commands/debug');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockFSWatcherAdd).toBeCalledTimes(1);
      expect(mockedBuild).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Watching filesystem for changes to source files (**/*)
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping filesystem watcher... ⏳
Stopping ${name}... 💔
Successfully stopped all running processes 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandOptions });
    });

  });
});