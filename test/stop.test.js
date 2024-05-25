import fs from 'node:fs';
import { cwd } from 'node:process';

import process, { stderr, stdout } from 'process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import versions from '../assets/versions.json';
import { SupportedApplications } from '../src/types/Application';
import { getValidLegacyPomFileFor, getValidPomFileFor } from './fixtures/pomFiles';

let stdOut = '';
let stdErr = '';

let commandExecutionOptions = '';

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockedStop = vi.fn();

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

  vi.doMock('docker-compose/dist/v2.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      stop: mockedStop,
    }
  });

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
})

Object.values(SupportedApplications.Values).forEach(name => {

  const tag = versions[name][Math.floor(Math.random()*versions[name].length)];

  describe(`dcdx stop - ${name}`, async () => {

    /******************************************************************************
     *
     *  AMPS BASED
     *
     ******************************************************************************/

    it(`dcdx stop (defaults with AMPS configuration for ${name} - legacy POM file)`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidLegacyPomFileFor(name, tag));
      vi.spyOn(fs, 'existsSync').mockImplementation(() => true);

      await import('../src/commands/stop');

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Stopping ${name} and postgresql... 💔
Stopped ${name} and postgresql 💪
`.trim() + '\n');

      expect(mockedStop).toBeCalledTimes(2);
      expect(commandExecutionOptions).toStrictEqual({
        database: 'postgresql',
      });
    });

    it(`dcdx stop (defaults with AMPS configuration for ${name})`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));

      await import('../src/commands/stop');

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Stopping ${name} and postgresql... 💔
Stopped ${name} and postgresql 💪
`.trim() + '\n');

      expect(mockedStop).toBeCalledTimes(2);
      expect(commandExecutionOptions).toStrictEqual({
        database: 'postgresql',
      });
    });

    it(`dcdx stop --database mssql (with AMPS configuration for ${name})`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));

      process.argv.push(...[ '--database', 'mssql' ]);
      await import('../src/commands/stop');

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Stopping ${name} and mssql... 💔
Stopped ${name} and mssql 💪
`.trim() + '\n');

      expect(mockedStop).toBeCalledTimes(2);
      expect(commandExecutionOptions).toStrictEqual({
        database: 'mssql',
      });
    });

    it(`dcdx stop --database mssql --cwd myDirectory (with AMPS configuration for ${name})`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag));

      process.argv.push(...[ '--database', 'mssql', '--cwd', 'myDirectory' ]);
      await import('../src/commands/stop');

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Stopping ${name} and mssql... 💔
Stopped ${name} and mssql 💪
`.trim() + '\n');

      expect(mockedStop).toBeCalledTimes(2);
      expect(commandExecutionOptions).toStrictEqual({
        cwd: 'myDirectory',
        database: 'mssql',
      });
    });

    it(`dcdx stop --activate-profiles myProfile (with AMPS configuration for ${name})`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag, 'myProfile'));

      process.argv.push(...[ '-P', 'myProfile' ]);
      await import('../src/commands/stop');

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Stopping ${name} and postgresql... 💔
Stopped ${name} and postgresql 💪
`.trim() + '\n');

      expect(mockedStop).toBeCalledTimes(2);
      expect(commandExecutionOptions).toStrictEqual({
        activateProfiles: 'myProfile',
        database: 'postgresql',
      });
    });

    it(`dcdx stop --activate-profiles myProfile --database mssql (with AMPS configuration for ${name})`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag, 'myProfile'));

      process.argv.push(...[ '-P', 'myProfile', '--database', 'mssql' ]);
      await import('../src/commands/stop');

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Stopping ${name} and mssql... 💔
Stopped ${name} and mssql 💪
`.trim() + '\n');

      expect(mockedStop).toBeCalledTimes(2);
      expect(commandExecutionOptions).toStrictEqual({
        activateProfiles: 'myProfile',
        database: 'mssql',
      });
    });

    it(`dcdx stop --activate-profiles myProfile --database mssql --cwd myDirectory (with AMPS configuration for ${name})`, async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(getValidPomFileFor(name, tag, 'myProfile'));

      process.argv.push(...[ '-P', 'myProfile', '--database', 'mssql', '--cwd', 'myDirectory' ]);
      await import('../src/commands/stop');

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Stopping ${name} and mssql... 💔
Stopped ${name} and mssql 💪
`.trim() + '\n');

      expect(mockedStop).toBeCalledTimes(2);
      expect(commandExecutionOptions).toStrictEqual({
        cwd: 'myDirectory',
        activateProfiles: 'myProfile',
        database: 'mssql',
      });
    });

    /******************************************************************************
     *
     *  NAME BASED
     *
     ******************************************************************************/

    it(`dcdx stop ${name}`, async () => {
      process.argv = [ 'vitest', 'dcdx', name ]
      await import('../src/commands/stop');

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Stopping ${name} and postgresql... 💔
Stopped ${name} and postgresql 💪
`.trim() + '\n');

      expect(mockedStop).toBeCalledTimes(2);
      expect(commandExecutionOptions).toStrictEqual({
        database: 'postgresql',
        name,
        tag: 'latest',
      });
    });

    it(`dcdx stop ${name} --tag ${tag}`, async () => {
      process.argv = [ 'vitest', 'dcdx', name, '--tag', tag ]
      await import('../src/commands/stop');

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Stopping ${name} and postgresql... 💔
Stopped ${name} and postgresql 💪
`.trim() + '\n');

      expect(mockedStop).toBeCalledTimes(2);
      expect(commandExecutionOptions).toStrictEqual({
        database: 'postgresql',
        name,
        tag
      });
    });

    it(`dcdx stop ${name} --tag latest --database mssql`, async () => {
      process.argv = [ 'vitest', 'dcdx', name, '--tag', 'latest', '--database', 'mssql' ]
      await import('../src/commands/stop');

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Stopping ${name} and mssql... 💔
Stopped ${name} and mssql 💪
`.trim() + '\n');

      expect(mockedStop).toBeCalledTimes(2);
      expect(commandExecutionOptions).toStrictEqual({
        name,
        database: 'mssql',
        tag: 'latest',
      });
    });

    it(`dcdx stop ${name} --database mssql`, async () => {
      process.argv = [ 'vitest', 'dcdx', name, '--database', 'mssql' ]
      await import('../src/commands/stop');

      expect(stdErr).toBe('');
      expect(stdOut).toBe(`
Stopping ${name} and mssql... 💔
Stopped ${name} and mssql 💪
`.trim() + '\n');

      expect(mockedStop).toBeCalledTimes(2);
      expect(commandExecutionOptions).toStrictEqual({
        database: 'mssql',
        name,
        tag: 'latest',
      });
    });

    it(`dcdx stop - invalid name`, async () => {
      const name = 'compass';
      mockExistsSync.mockReturnValue(false);

      process.argv = [ 'vitest', 'dcdx', name ]
      await import('../src/commands/stop');

      expect(stdErr.startsWith(`error: too many arguments for 'fromAMPS'. Expected 0 arguments but got 1.`)).toBeTruthy();
      expect(stdOut).toBe('');

      expect(mockedStop).toBeCalledTimes(0);
      expect(commandExecutionOptions).toStrictEqual({
        database: 'postgresql'
      })
    });

    it(`dcdx stop ${name} --tag invalid`, async () => {
      process.argv = [ 'vitest', 'dcdx', name, '--tag', 'invalid' ]
      await import('../src/commands/stop');

      expect(stdErr.startsWith(`error: option '-t, --tag <tag>' argument 'invalid' is invalid.`)).toBeTruthy();;
      expect(stdOut).toBe('');

      expect(mockedStop).toBeCalledTimes(0);
      expect(commandExecutionOptions).toBe('');
    });

    it(`dcdx stop ${name} --tag latest --database invalid`, async () => {
      process.argv = [ 'vitest', 'dcdx', name, '--tag', 'latest', '--database', 'invalid' ]
      await import('../src/commands/stop');

      expect(stdErr.startsWith(`error: option '-d, --database <name>' argument 'invalid' is invalid. Allowed choices are postgresql, mysql, mssql.`)).toBeTruthy();
      expect(stdOut).toBe('');

      expect(mockedStop).toBeCalledTimes(0);
      expect(commandExecutionOptions).toBe('');
    });

    it(`dcdx stop ${name} --tag latest --database mssql --activate-profiles invalid`, async () => {
      process.argv = [ 'vitest', 'dcdx', name, '--tag', 'latest', '--database', 'mssql', '--activate-profiles', 'invalid' ]
      await import('../src/commands/stop');

      expect(stdErr.startsWith('InvalidArgumentError: Invalid argument "--activate-profiles"')).toBeTruthy();
      expect(stdOut).toBe('');

      expect(mockedStop).toBeCalledTimes(0);
      expect(commandExecutionOptions).toStrictEqual({
        activateProfiles: 'invalid',
        database: 'mssql',
        name,
        tag: 'latest',
      });
    });

    it(`dcdx stop ${name} --tag latest --database mssql --activate-profiles invalid --cwd invalidDirectory`, async () => {
      process.argv = [ 'vitest', 'dcdx', name, '--tag', 'latest', '--database', 'mssql', '--activate-profiles', 'invalid', '--cwd', 'invalidDirectory' ]
      await import('../src/commands/stop');

      expect(stdErr.startsWith('InvalidArgumentError: Invalid argument "--activate-profiles"')).toBeTruthy();
      expect(stdOut).toBe('');

      expect(mockedStop).toBeCalledTimes(0);
      expect(commandExecutionOptions).toStrictEqual({
        activateProfiles: 'invalid',
        cwd: 'invalidDirectory',
        database: 'mssql',
        name,
        tag: 'latest',
      });
    });

    it(`dcdx stop ${name} --tag latest --database mssql --cwd invalidDirectory`, async () => {
      process.argv = [ 'vitest', 'dcdx', name, '--tag', 'latest', '--database', 'mssql', '--cwd', 'invalidDirectory' ]
      await import('../src/commands/stop');

      expect(stdErr.startsWith('InvalidArgumentError: Invalid argument "--cwd"')).toBeTruthy();
      expect(stdOut).toBe('');

      expect(mockedStop).toBeCalledTimes(0);
      expect(commandExecutionOptions).toStrictEqual({
        cwd: 'invalidDirectory',
        database: 'mssql',
        name,
        tag: 'latest',
      });
    });

  });
});