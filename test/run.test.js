import { setMaxListeners } from 'node:events';
import { cwd } from 'node:process';
import { EventEmitter } from 'node:stream';

import axios from 'axios';
import process, { stderr, stdout } from 'process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import versions from '../assets/versions.json';
import { SupportedApplications } from '../src/types/Application';
import { getValidLegacyPomFileFor, getValidPomFileFor } from './fixtures/pomFiles';

let stdOut = '';
let stdErr = '';

const SpawnEventEmitter = new EventEmitter();
let commandExecutionOptions = '';

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
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
  debug: false,
  port: '80',
  prune: false,
  xms: '1024m',
  xmx: '1024m',
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
});

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  stdOut = '';
  stdErr = '';
  commandExecutionOptions = '';
  process.argv = [ 'vitest', cwd() ];
  setMaxListeners();
})

Object.values(SupportedApplications.Values).forEach(name => {

  const tag = versions[name][Math.floor(Math.random()*versions[name].length)];

  describe(`dcdx run - ${name}`, async () => {

    /******************************************************************************
     *
     *  AMPS BASED
     *
     ******************************************************************************/

    it(`dcdx run (git clone)`, async () => {
      mockExistsSync.mockImplementation((path) => {
        if (path.endsWith('.xml')) {
          return true;
        } else {
          return false;
        }
      });
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandOptions });
    });

    it(`dcdx run (git pull)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandOptions });
    });

    it(`dcdx run (docker quits unexpected)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 1);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
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
Starting ${name}... 💃
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandOptions });
    });

    it(`dcdx run (fails to become available)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: name !== 'bamboo' ? 200 : 204,
        data: { status: 'FAILED' }
      })

      vi.useFakeTimers();

      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // Run all the timers
      await vi.runAllTimersAsync();
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(1);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(301);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      let counter = '';
      [...Array(301)].forEach((_, index) => counter += `Waiting for ${name} to become available... ${index}s\n`);

      expect(stdErr).toBe(`A timeout occurred while waiting for ${name} to become available ⛔`.trim() + '\n');
      expect(stdOut).toBe(`
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
${counter.trim()}
Failed to start ${name} ⛔
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandOptions });
    });

    it(`dcdx run (fails to become available - Axios error)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockRejectedValue({
        status: 500
      })

      vi.useFakeTimers();

      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // Run all the timers
      await vi.runAllTimersAsync();
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(1);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(301);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      let counter = '';
      [...Array(301)].forEach((_, index) => counter += `Waiting for ${name} to become available... ${index}s\n`);

      expect(stdErr).toBe(`A timeout occurred while waiting for ${name} to become available ⛔`.trim() + '\n');
      expect(stdOut).toBe(`
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
${counter.trim()}
Failed to start ${name} ⛔
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandOptions });
    });

    it(`dcdx run --tag latest`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--tag', 'latest' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(5);
      expect(mockReadFileSync).toBeCalledTimes(4);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        tag: 'latest'
      });
    });

    it(`dcdx run --tag invalid`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--tag', 'invalid' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(4);
      expect(mockReadFileSync).toBeCalledTimes(4);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(0);
      expect(mockedAuthenticate).toBeCalledTimes(0);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr.startsWith(`Error: Product version 'invalid' is invalid. Allowed choices are`)).toBeTruthy();
      expect(stdOut).toBe('');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        tag: 'invalid'
      });
    });

    it(`dcdx run --database mysql`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--database', 'mysql' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(1);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(1);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting ${name}... 💃
Starting instance of mysql... 💃
Database is ready and accepting connections on localhost:3306 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        database: 'mysql'
      });
    });

    it(`dcdx run --database mssql`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--database', 'mssql' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(1);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting ${name}... 💃
Starting instance of mssql... 💃
Database is ready and accepting connections on localhost:1433 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        database: 'mssql'
      });
    });

    it(`dcdx run --database invalid`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--database', 'invalid' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(0);
      expect(mockReadFileSync).toBeCalledTimes(0);
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

    it(`dcdx run --port 1234`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--port', '1234' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:1234 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        port: '1234'
      });
    });

    it(`dcdx run --contextPath atlassian`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '-c', 'atlassian' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80/atlassian 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        contextPath: 'atlassian'
      });
    });

    it(`dcdx run --xms 2gb`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--xms', '2gb' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        xms: '2gb'
      });
    });

    it(`dcdx run --xmx 2gb`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--xmx', '2gb' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        xmx: '2gb'
      });
    });

    it(`dcdx run --clean`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--clean' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(1);

      expect(mockedDownAll).toBeCalledTimes(2);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        clean: true
      });
    });

    it(`dcdx run --prune`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), '--prune' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(1);

      expect(mockedDownAll).toBeCalledTimes(2);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        prune: true
      });
    });

    it(`dcdx run (legacy AMPS plugin)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidLegacyPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(8);
      expect(mockReadFileSync).toBeCalledTimes(7);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandOptions });
    });

    /******************************************************************************
     *
     *  NAME BASED
     *
     ******************************************************************************/

    it(`dcdx run ${name} (git clone)`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name ];
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        name,
        tag: 'latest'
      });
    });

    it(`dcdx run ${name} (git pull)`, async () => {
      mockExistsSync.mockImplementation((path) => !path.endsWith('.xml'))
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name ];
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        name,
        tag: 'latest'
      });
    });

    it(`dcdx run ${name} (docker quits unexpected)`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name ];
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 1);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(1);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(0);
      expect(mockedAuthenticate).toBeCalledTimes(0);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr.startsWith('Error: Docker exited with code 1')).toBeTruthy();
      expect(stdOut).toBe(`
Starting ${name}... 💃
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        name,
        tag: 'latest',
      });
    });

    it(`dcdx run ${name} (fails to become available)`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: name !== 'bamboo' ? 200 : 204,
        data: { status: 'FAILED' }
      })

      vi.useFakeTimers();

      process.argv = [ 'vitest', cwd(), name ];
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // Run all the timers
      await vi.runAllTimersAsync();
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(1);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(301);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      let counter = '';
      [...Array(301)].forEach((_, index) => counter += `Waiting for ${name} to become available... ${index}s\n`);

      expect(stdErr).toBe(`A timeout occurred while waiting for ${name} to become available ⛔`.trim() + '\n');
      expect(stdOut).toBe(`
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
${counter.trim()}
Failed to start ${name} ⛔
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        name,
        tag: 'latest'
      });
    });

    it(`dcdx run ${name} (fails to become available - Axios error)`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockRejectedValue({
        status: 500
      })

      vi.useFakeTimers();

      process.argv = [ 'vitest', cwd(), name ];
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // Run all the timers
      await vi.runAllTimersAsync();
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(1);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(301);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      let counter = '';
      [...Array(301)].forEach((_, index) => counter += `Waiting for ${name} to become available... ${index}s\n`);

      expect(stdErr).toBe(`A timeout occurred while waiting for ${name} to become available ⛔`.trim() + '\n');
      expect(stdOut).toBe(`
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
${counter.trim()}
Failed to start ${name} ⛔
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        name,
        tag: 'latest'
      });
    });

    it(`dcdx run ${name} --tag latest`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name, '--tag', 'latest' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        name,
        tag: 'latest'
      });
    });

    it(`dcdx run ${name} --tag invalid`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name, '-t', 'invalid' ];
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(0);
      expect(mockReadFileSync).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(0);
      expect(mockedAuthenticate).toBeCalledTimes(0);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr.startsWith(`error: option '-t, --tag <name>' argument 'invalid' is invalid.`)).toBeTruthy();
      expect(stdOut).toBe('');

      expect(commandExecutionOptions).toBe('');
    });

    it(`dcdx run ${name} --tag ${tag} -P invalid`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name, '--tag', tag, '-P', 'invalid' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(0);
      expect(mockReadFileSync).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(0);
      expect(mockedAuthenticate).toBeCalledTimes(0);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr.startsWith('InvalidArgumentError: Invalid argument "--activate-profiles"')).toBeTruthy();
      expect(stdOut).toBe('');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        activateProfiles: 'invalid',
        name,
        tag
      });
    });

    it(`dcdx run ${name} --tag ${tag} --cwd invalid`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name, '--tag', tag, '--cwd', 'invalid' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(0);
      expect(mockReadFileSync).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(0);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(0);
      expect(mockedAuthenticate).toBeCalledTimes(0);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr.startsWith('InvalidArgumentError: Invalid argument "--cwd"')).toBeTruthy();
      expect(stdOut).toBe('');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        cwd: 'invalid',
        name,
        tag
      });
    });

    it(`dcdx run ${name} --database mysql`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name, '--database', 'mysql' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(1);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(1);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting ${name}... 💃
Starting instance of mysql... 💃
Database is ready and accepting connections on localhost:3306 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        database: 'mysql',
        name,
        tag: 'latest'
      });
    });

    it(`dcdx run ${name} --database mssql`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name, '--database', 'mssql' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(1);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting ${name}... 💃
Starting instance of mssql... 💃
Database is ready and accepting connections on localhost:1433 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        database: 'mssql',
        name,
        tag: 'latest'
      });
    });

    it(`dcdx run ${name} --database invalid`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name, '--database', 'invalid' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(0);
      expect(mockReadFileSync).toBeCalledTimes(0);
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

    it(`dcdx run ${name} --port 1234`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name, '--port', '1234' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:1234 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        port: '1234',
        name,
        tag: 'latest'
      });
    });

    it(`dcdx run ${name} --contextPath atlassian`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name, '-c', 'atlassian' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80/atlassian 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        contextPath: 'atlassian',
        name,
        tag: 'latest'
      });
    });

    it(`dcdx run ${name} --xms 2gb`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name, '--xms', '2gb' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        xms: '2gb',
        name,
        tag: 'latest'
      });
    });

    it(`dcdx run ${name} --xmx 2gb`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name, '--xmx', '2gb' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
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
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        xmx: '2gb',
        name,
        tag: 'latest'
      });
    });

    it(`dcdx run ${name} --clean`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name, '--clean' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(1);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(2);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(2);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        clean: true,
        name,
        tag: 'latest'
      });
    });

    it(`dcdx run ${name} --prune`, async () => {
      mockExistsSync.mockReturnValue(false);
      mockedClone.mockResolvedValue(true);
      mockedPull.mockResolvedValue(true);
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);
      mockedPS.mockResolvedValue({ data: { services: [ { name, state: 'up' }] }});
      vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: { state: 'RUNNING' }
      })

      process.argv = [ 'vitest', cwd(), name, '--prune' ]
      await import('../src/commands/run');
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker build
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));
      // We need to stop Docker log tail
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);
      expect(mockedClone).toBeCalledTimes(1);
      expect(mockedPull).toBeCalledTimes(0);

      expect(mockedDownAll).toBeCalledTimes(2);
      expect(mockedPS).toBeCalledTimes(2);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(2);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting ${name}... 💃
Starting instance of postgresql... 💃
Database is ready and accepting connections on localhost:5432 🗄️
Waiting for ${name} to become available... 0s
The application ${name} is ready on http://localhost:80 🎉
Stopping ${name}... 💔
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandOptions,
        prune: true,
        name,
        tag: 'latest'
      });
    });

  });
});