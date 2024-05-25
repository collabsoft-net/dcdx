import { cwd } from 'node:process';
import { EventEmitter } from 'node:stream';

import process, { stderr, stdout } from 'process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import versions from '../assets/versions.json';
import { getZodDefaults } from '../src/helpers/getZodDefaults';
import { MSSQLOptions, MySQLOptions, PostgreSQLOptions, SupportedDatabaseEngines } from '../src/types/Database';

let stdOut = '';
let stdErr = '';

let commandExecutionOptions = {};
const SpawnEventEmitter = new EventEmitter();

const mockedDownAll = vi.fn();
const mockedPS = vi.fn();
const mockedStop = vi.fn();
const mockedUpAll = vi.fn();
const mockedAuthenticate = vi.fn();
const mockedQuery = vi.fn();
const mockedSpawn = vi.fn().mockImplementation(() => SpawnEventEmitter);

beforeEach(() => {
  stdOut = '';
  stdErr = '';

  mockedStop.mockResolvedValue(true);
  vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
  vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });
  vi.spyOn(process, 'on').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation(() => {});
  vi.mock('exit-hook');

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
  commandExecutionOptions = {};
  process.argv = [ 'vitest', cwd() ];
})

Object.values(SupportedDatabaseEngines.Values).forEach(name => {

  const tag = versions[name][Math.floor(Math.random()*versions[name].length)];
  const defaultOptions = getZodDefaults(
    name === 'postgresql'
      ? PostgreSQLOptions
      : name === 'mysql'
        ? MySQLOptions
        : MSSQLOptions);
  delete defaultOptions.driver;

  describe(`dcdx database - ${name}`, async () => {

    /**
     * Fail to start a database if no arguments are provided
     */
    it(`dcdx database`, async () => {
      await import('../src/commands/database');

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(0);
      expect(mockedAuthenticate).toBeCalledTimes(0);

      expect(stdErr.startsWith('Usage: dcdx database [options] [command]')).toBeTruthy();
      expect(stdOut).toBe('');

      expect(commandExecutionOptions).toStrictEqual({});
    });

    /**
     * Start the database
     *
     * Succesfully start the database using default options
     */
    it(`dcdx database ${name}`, async () => {

      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(name === 'postgresql' ? 0 : name === 'mysql' ? 1 : 3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Database is ready and accepting connections on localhost:${defaultOptions.port} 🗄️
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name });
    });

    /**
     * Fail to verify the status of the database
     *
     * Succesfully start the database using default options
     * but fail to connect & authenticate the user
     */
    it(`dcdx database ${name} (failed to start)`, async () => {

      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockRejectedValue(new Error());
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(1);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Failed to verify status of ${name} ⛔
Stopping ${name}... ⏳
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name });
    });

    /**
     * Succesfully start the database with the provided tag
     *
     * Succesfully start the database using default options
     * but from the specified Docker tag
     */
    it(`dcdx database ${name} --tag ${tag}`, async () => {

      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--tag', tag ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(name === 'postgresql' ? 0 : name === 'mysql' ? 1 : 3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Database is ready and accepting connections on localhost:${defaultOptions.port} 🗄️
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name, tag });
    });

    /**
     * Fail to start the database with the provided tag
     *
     * The database cannot be started because the tag is invalid
     */
    it(`dcdx database ${name} --tag invalid`, async () => {

      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--tag', 'invalid' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(0);
      expect(mockedAuthenticate).toBeCalledTimes(0);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr.startsWith(`error: option '-t, --tag <tag>' argument 'invalid' is invalid`)).toBeTruthy();
      expect(stdOut).toBe('');

      expect(commandExecutionOptions).toStrictEqual({});
    });

    /**
     * Succesfully start the database and provision a database
     *
     * The database enigine is started and a new database is initialized
     * using the provided name
     */
    it(`dcdx database ${name} --database myFirstDB`, async () => {

      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--database', 'myFirstDB' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(name === 'postgresql' ? 0 : name === 'mysql' ? 1 : 3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Database is ready and accepting connections on localhost:${defaultOptions.port} 🗄️
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name, database: 'myFirstDB' });
    });

    /**
     * Fail to initialise the database
     *
     * The database enigine fails to start because of an error
     * while trying to provision a new database
     */
    it.skipIf(name === 'postgresql')(`dcdx database ${name} --database myFirstDB (failed to initialize)`, async () => {

      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockRejectedValue(new Error());

      process.argv = [ 'vitest', cwd(), name, '--database', 'myFirstDB' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(1);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(1);

      expect(stdErr.startsWith(`An error occurred while trying to run the following SQL query:`)).toBeTruthy();
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Database is ready and accepting connections on localhost:${defaultOptions.port} 🗄️
Stopping ${name}... ⏳
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name, database: 'myFirstDB' });
    });

    /**
     * Succesfully start the database using a different port
     *
     * The database enigine is started using the specified port
     */
    it(`dcdx database ${name} --port 1234`, async () => {

      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--port', '1234' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(name === 'postgresql' ? 0 : name === 'mysql' ? 1 : 3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Database is ready and accepting connections on localhost:1234 🗄️
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name, port: '1234' });
    });

    /**
     * Succesfully start the database using the specified username
     */
    it.skipIf(name === 'mssql')(`dcdx database ${name} --username atlassian`, async () => {

      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--username', 'atlassian' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(name === 'postgresql' ? 0 : name === 'mysql' ? 1 : 3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Database is ready and accepting connections on localhost:${defaultOptions.port} 🗄️
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name, username: 'atlassian' });
    });

    /**
     * Succesfully start the database using the specified edition
     */
    it.skipIf(name !== 'mssql')(`dcdx database ${name} --edition Enterprise`, async () => {

      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--edition', 'Enterprise' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(name === 'postgresql' ? 0 : name === 'mysql' ? 1 : 3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Database is ready and accepting connections on localhost:${defaultOptions.port} 🗄️
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name, edition: 'Enterprise' });
    });

    /**
     * Fail to start the database using the specified edition
     */
    it.skipIf(name !== 'mssql')(`dcdx database ${name} --edition invalid`, async () => {

      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--edition', 'invalid' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(0);
      expect(mockedAuthenticate).toBeCalledTimes(0);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr.startsWith(`error: option '-e, --edition <edition>' argument 'invalid' is invalid`)).toBeTruthy();
      expect(stdOut).toBe('');

      expect(commandExecutionOptions).toStrictEqual({});
    });

    /**
     * Successfully start the database using the specified password
     */
    it(`dcdx database ${name} --password atlassian`, async () => {

      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--password', 'atlassian' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(name === 'postgresql' ? 0 : name === 'mysql' ? 1 : 3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Database is ready and accepting connections on localhost:${defaultOptions.port} 🗄️
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name, password: 'atlassian' });
    });

    /**
     * Successfully start the database with "clean" option
     */
    it(`dcdx database ${name} --clean`, async () => {

      mockedDownAll.mockReturnValue(Promise.resolve());
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--clean' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(1);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(name === 'postgresql' ? 0 : name === 'mysql' ? 1 : 3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Database is ready and accepting connections on localhost:${defaultOptions.port} 🗄️
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name, clean: true });
    });

    /**
     * Successfully start the database with "prune" option
     */
    it(`dcdx database ${name} --prune`, async () => {
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--prune' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(name === 'postgresql' ? 0 : name === 'mysql' ? 1 : 3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Database is ready and accepting connections on localhost:${defaultOptions.port} 🗄️
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name, prune: true });
    });

    /**
     * Successfully prune the database after it fails to start
     */
    it(`dcdx database ${name} --prune (after failure to start)`, async () => {

      mockedDownAll.mockReturnValue(Promise.resolve());
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockRejectedValue(new Error());
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--prune' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(1);
      expect(mockedPS).toBeCalledTimes(0);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(0);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Failed to verify status of ${name} ⛔
Stopping ${name}... ⏳
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name, prune: true });
    });

    /**
     * Successfully start the database with verbose logging
     */
    it(`dcdx database ${name} --verbose`, async () => {
      mockedPS.mockResolvedValue({ data: { services: [ { name }] }});
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--verbose' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));
      // Shut down docker gracefully
      SpawnEventEmitter.emit('exit', 0);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(1);
      expect(mockedStop).toBeCalledTimes(0);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(name === 'postgresql' ? 0 : name === 'mysql' ? 1 : 3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Database is ready and accepting connections on localhost:${defaultOptions.port} 🗄️
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name, verbose: true });
    });

    /**
     * Successfully start the database but stop after Docker quits unexpectedly
     */
    it(`dcdx database ${name} --verbose (docker quits unexpectedly)`, async () => {
      mockedPS.mockResolvedValue({ data: { services: [ { name }] }});
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--verbose' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));
      // Shut down docker unexpectedly
      SpawnEventEmitter.emit('exit', 1);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(1);
      expect(mockedStop).toBeCalledTimes(1);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(name === 'postgresql' ? 0 : name === 'mysql' ? 1 : 3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Database is ready and accepting connections on localhost:${defaultOptions.port} 🗄️
Stopping ${name}... ⏳
Stopped ${name} 💪
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name, verbose: true });
    });

    /**
     * Successfully start the database and fail to stop after Docker quits unexpectedly
     */
    it(`dcdx database ${name} --verbose (docker quits unexpectedly, fails to stop ${name})`, async () => {
      mockedPS.mockResolvedValue({ data: { services: [ { name }] }});
      mockedUpAll.mockReturnValue(Promise.resolve());
      mockedStop.mockRejectedValue(new Error());
      mockedAuthenticate.mockResolvedValue(true);
      mockedQuery.mockResolvedValue(true);

      process.argv = [ 'vitest', cwd(), name, '--verbose' ];
      await import('../src/commands/database');
      await new Promise(resolve => process.nextTick(resolve));
      // Shut down docker unexpectedly
      SpawnEventEmitter.emit('exit', 1);
      await new Promise(resolve => process.nextTick(resolve));

      expect(mockedDownAll).toBeCalledTimes(0);
      expect(mockedPS).toBeCalledTimes(1);
      expect(mockedStop).toBeCalledTimes(1);
      expect(mockedUpAll).toBeCalledTimes(1);
      expect(mockedAuthenticate).toBeCalledTimes(1);
      expect(mockedQuery).toBeCalledTimes(name === 'postgresql' ? 0 : name === 'mysql' ? 1 : 3);

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Starting instance of ${name}... 💃
Database is ready and accepting connections on localhost:${defaultOptions.port} 🗄️
Stopping ${name}... ⏳
Failed to stopped ${name}, manual action is required
`.trim() + '\n');

      expect(commandExecutionOptions).toStrictEqual({ ...defaultOptions, name, verbose: true });
    });

  });
});