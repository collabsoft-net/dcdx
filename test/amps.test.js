/*
  Unit tests for dcdx AMPS implementation

  The purpose of these tests is to cover all situations in which an error might occur
  The focus lies on making sure that the user receives meaningful feedback

  The following scenario's are being tested:

  WITHOUT PROFILES
  > There is no pom file
  > The pom file is not an Atlassian Plugin
  > The pom file does not have an AMPS configuration
  > The pom file does not have a supported AMPS product
  > The pom file does not have a version
  > The pom file does not have a supported version
  > The pom file has incorrect property replacement for the version
  > The pom file has multiple AMPS configurations

  WITH A SINGLE PROFILE
  > The pom file does not have an activated profile with AMPS configuration
  > The pom file does not have an activated profile with a supported AMPS product
  > The pom file does not have an activated profile with a version
  > The pom file does not have an activated profile with a supported version
  > The pom file does have an activated profile but has incorrect property replacement for the version
  > The pom file has multiple AMPS configurations in the activated profile

  WITH MULTIPLE PROFILES
  > The pom file does not have an AMPS configuration in any of the activated profiles
  > The pom file does not have a supported AMPS product in any of the activated profiles
  > The pom file does not have a version in any of the activated profiles
  > The pom file does not have a supported version in any of the activated profiles
  > The pom file has incorrect property replacement for the version in any of the activated profiles
  > The pom file has multiple AMPS configurations in multple activated profiles

  LEGACY AMPS PLUGINS
  > The pom file does not have a supported AMPS product (legacy)
  > The pom file does not have a version (legacy)
  > The pom file does not have a supported version (legacy)
  > The pom file has incorrect property replacement for the version (legacy)
  > The pom file has multiple AMPS configurations (legacy)
*/

import process, { cwd, stderr, stdout } from 'process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as pomFiles from './fixtures/pomFiles';

const defaultCommandExecutionOptions = {
  'build': {
    watch: false
  },
  'debug': {
    clean: false,
    database: 'postgresql',
    debug: true,
    port: '80',
    prune: false,
    watch: false,
    xms: '1024m',
    xmx: '1024m',
  },
  'reset': {
    database: 'postgresql'
  },
  'run': {
    clean: false,
    database: 'postgresql',
    debug: false,
    port: '80',
    prune: false,
    xms: '1024m',
    xmx: '1024m'
  },
  'stop': {
    database: 'postgresql'
  }
}

let commandExecutionOptions = '';
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockedDockerCompose = vi.hoisted(() => vi.fn().mockReturnValue(Promise.resolve()));

beforeEach(() => {
  vi.mock('exit-hook');
  vi.spyOn(process, 'on').mockImplementation(() => {});
  vi.spyOn(process, 'exit').mockImplementation(() => {});

  vi.doMock('node:fs', async (importOriginal) => ({
    ...(await importOriginal()),
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync
  }));

  vi.mock('docker-compose/dist/v2.js', async (importOriginal) => ({
    ...(await importOriginal()),
    downAll: mockedDockerCompose,
    execCompose: mockedDockerCompose,
    ps: mockedDockerCompose,
    upAll: mockedDockerCompose,
    stop: mockedDockerCompose
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
  commandExecutionOptions = '';
  process.argv = [ 'vitest', cwd() ];
});

[ 'build', 'debug', 'reset', 'run', 'stop' ].forEach(command => {

  describe(`Testing AMPS support for 'dcdx ${command}'`, async () => {

    /******************************************************************************
     *
     *  POM FILES WITHOUT PROFILE(S)
     *
     ******************************************************************************/

    /*
      There is no pom file

      Test the default command without providing arguments
      and without a pom.xml file present in the current directory
    */

    it(`There is no pom file`, async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(false);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(0);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('Unable to find an Atlassian Plugin project in the current directory 🤔');
      expect(commandExecutionOptions).toStrictEqual(defaultCommandExecutionOptions[command]);
    });

    /*
      The pom file is not an Atlassian Plugin

      Test the default command without providing arguments
      and with a pom.xml file present that is not an Atlassian Plugin (<packaging>atlassian-plugin</packaging>)
    */

    it(`The pom file is not an Atlassian Plugin`, async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithoutAtlassianPackaging);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(1);
      expect(mockReadFileSync).toBeCalledTimes(1);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('Unable to find an Atlassian Plugin project in the current directory 🤔');
      expect(commandExecutionOptions).toStrictEqual(defaultCommandExecutionOptions[command]);
    });

    /*
      The pom file does not have an AMPS configuration

      Test the default command without providing arguments
      and with a pom.xml file present that has an Atlassian packaging
      but does not have an AMPS configuration
    */

    it('The pom file does not have an AMPS configuration', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithoutProduct);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(2);
      expect(mockReadFileSync).toBeCalledTimes(2);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('The Atlassian Plugin project does not contain an AMPS configuration, unable to detect product 😰');
      expect(commandExecutionOptions).toStrictEqual(defaultCommandExecutionOptions[command]);
    });

    /*
      The pom file does not have a supported AMPS product

      Test the default command without providing arguments
      and with a pom.xml file present that is an Atlassian Plugin
      but does not contain a supported AMPS plugin
    */

    it('The pom file does not have a supported AMPS product', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithInvalidProduct);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(2);
      expect(mockReadFileSync).toBeCalledTimes(2);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('The Atlassian Plugin project does not contain an AMPS configuration, unable to detect product 😰');
      expect(commandExecutionOptions).toStrictEqual(defaultCommandExecutionOptions[command]);
    });

    /*
      The pom file does not have a version

      Test the default command without providing arguments
      and with a pom.xml file present that is an Atlassian Plugin
      and has an AMPS plugin but without a <productVersion/> element
    */

   it('The pom file does not have a version', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithProductButWithoutVersion);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(3);
      expect(mockReadFileSync).toBeCalledTimes(3);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('Failed to determine version from AMPS and no product version provided (--tag)');
      expect(commandExecutionOptions).toStrictEqual(defaultCommandExecutionOptions[command]);
    });

    /*
      The pom file does not have a supported version

      Test the default command without providing arguments
      and with a pom.xml file present that is an Atlassian Plugin
      and has an AMPS plugin but without a <productVersion/> element
    */

      it('The pom file does not have a supported version', async () => {
        let stdOut = '';
        let stdErr = '';

        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(pomFiles.pomFileWithProductButWithInvalidVersion);
        vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
        vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

        await import(`../src/commands/${command}`);

        expect(mockedDockerCompose).toBeCalledTimes(0);
        expect(mockExistsSync).toBeCalledTimes(7);
        expect(mockReadFileSync).toBeCalledTimes(7);

        expect(stdOut).toContain(
          command === 'build' || command === 'debug'
            ? 'Successfully stopped all running processes 💪'
            : ''
        );
        expect(stdErr).toContain(`Product version '1000.000.000' is invalid.`);
        expect(commandExecutionOptions).toStrictEqual(defaultCommandExecutionOptions[command]);
      });

    /*
      The pom file has incorrect property replacement for the version

      Test the default command without providing arguments
      and with a pom.xml file present that is an Atlassian Plugin
      and has an AMPS plugin with a <productVersion/> element that
      uses a property that cannot be resolved during property replacement
    */

    it('The pom file has incorrect property replacement for the version', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithProductAndVersionWithIncorrectPropertyReplacement);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain(`Product version '\${invalidProperty}' is invalid.`);
      expect(commandExecutionOptions).toStrictEqual(defaultCommandExecutionOptions[command]);
    });

    /*
      The pom file has multiple AMPS configurations

      Test the default command without providing arguments
      and with a pom.xml file present that has an Atlassian packaging
      but has multiple AMPS configurations
    */

    it('The pom file has multiple AMPS configurations', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithMultipleProducts);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(2);
      expect(mockReadFileSync).toBeCalledTimes(2);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('The Atlassian Plugin project contains multiple AMPS configuration, unable to decide which product to use 😰');
      expect(commandExecutionOptions).toStrictEqual(defaultCommandExecutionOptions[command]);
    });

    /******************************************************************************
     *
     *  POM FILES WITH A SINGLE ACTIVATED PROFILE
     *
     ******************************************************************************/

    /*
      The pom file does not have an activated profile with AMPS configuration

      Test the default command without providing arguments and with a pom.xml
      file present that has an Atlassian packaging but does not have an active
      profile that has that has a valid AMPS configuration
    */

    it('The pom file does not have an activated profile with AMPS configuration', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithoutActiveProfile);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      process.argv = [ 'vitest', 'dcdx', '-P', 'invalid' ]
      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(2);
      expect(mockReadFileSync).toBeCalledTimes(2);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('The Atlassian Plugin project does not contain an AMPS configuration, unable to detect product 😰');
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandExecutionOptions[command],
        activateProfiles: 'invalid'
      });
    });

    /*
      The pom file does not have an activated profile with a supported AMPS product

      Test the default command without providing arguments and with a pom.xml
      file present that has an Atlassian packaging but does not have an active
      profile that has that has a valid AMPS configuration
    */

    it('The pom file does not have an activated profile with a supported AMPS product', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithActiveProfileWithoutProducts);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      process.argv = [ 'vitest', 'dcdx', '-P', 'active' ]
      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(2);
      expect(mockReadFileSync).toBeCalledTimes(2);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('The Atlassian Plugin project does not contain an AMPS configuration, unable to detect product 😰');
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandExecutionOptions[command],
        activateProfiles: 'active'
      });
    });

    /*
      The pom file does not have an activated profile with a version

      Test the default command without providing arguments
      and with a pom.xml file present that is an Atlassian Plugin
      and has an active profile with an AMPS plugin but without a <productVersion/> element
    */

   it('The pom file does not have an activated profile with a version', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithActiveProfileWithoutVersion);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      process.argv = [ 'vitest', 'dcdx', '-P', 'active' ]
      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(3);
      expect(mockReadFileSync).toBeCalledTimes(3);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('Failed to determine version from AMPS and no product version provided (--tag)');
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandExecutionOptions[command],
        activateProfiles: 'active'
      });
    });

    /*
      The pom file does not have an activated profile with a supported version

      Test the default command without providing arguments
      and with a pom.xml file present that is an Atlassian Plugin
      and has an active profile with an AMPS plugin but with a <productVersion/> element
      that does not contain a valid version
    */

   it('The pom file does not have an activated profile with a supported version', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithActiveProfileWithoutSupportedVersion);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      process.argv = [ 'vitest', 'dcdx', '-P', 'active' ]
      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain(`Product version '1000.000.000' is invalid.`);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandExecutionOptions[command],
        activateProfiles: 'active'
      })
    });

    /*
      The pom file does have an activated profile but has incorrect property replacement for the version

      Test the default command without providing arguments
      and with a pom.xml file present that is an Atlassian Plugin
      and has an active profile with an AMPS plugin with a <productVersion/> element
      that uses a property that cannot be resolved during property replacement
    */

    it('The pom file does have an activated profile but has incorrect property replacement for the version', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithActiveProfileAndVersionWithIncorrectPropertyReplacement);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      process.argv = [ 'vitest', 'dcdx', '-P', 'active' ]
      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain(`Product version '\${invalidProperty}' is invalid.`);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandExecutionOptions[command],
        activateProfiles: 'active'
      });
    });

    /*
      The pom file has multiple AMPS configurations in the activated profile

      Test the default command without providing arguments and with a pom.xml
      file present that has an Atlassian packaging and an active profile
      that has that has multiple valid AMPS configurations
    */

    it('The pom file has multiple AMPS configurations in the activated profile', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithActiveProfileWithMultipleProducts);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      process.argv = [ 'vitest', 'dcdx', '-P', 'active' ]
      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(2);
      expect(mockReadFileSync).toBeCalledTimes(2);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('The Atlassian Plugin project contains multiple AMPS configuration, unable to decide which product to use 😰');
      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandExecutionOptions[command], activateProfiles: 'active' });
    });

    /******************************************************************************
     *
     *  POM FILES WITH MULTIPLE ACTIVATED PROFILES
     *
     ******************************************************************************/

    /*
      The pom file does not have an AMPS configuration in any of the activated profiles

      Test the default command without providing arguments and with a pom.xml
      file present that has an Atlassian packaging and an multiple active profiles
      with none of them having a valid AMPS configurations
    */

    it('The pom file does not have an AMPS configuration in any of the activated profiles', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithMultipleActiveProfilesWithoutProducts);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      process.argv = [ 'vitest', 'dcdx', '-P', 'active1,active2' ]
      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(2);
      expect(mockReadFileSync).toBeCalledTimes(2);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('The Atlassian Plugin project does not contain an AMPS configuration, unable to detect product 😰');
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandExecutionOptions[command],
        activateProfiles: 'active1,active2'
      });
    });

    /*
      The pom file does not have a supported AMPS product in any of the activated profiles

      Test the default command without providing arguments and with a pom.xml
      file present that has an Atlassian packaging and an multiple active profiles
      with none of them having a valid AMPS configurations with supported products
    */

    it('The pom file does not have a supported AMPS product in any of the activated profiles', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithMultipleActiveProfilesWithoutValidProducts);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      process.argv = [ 'vitest', 'dcdx', '-P', 'active1,active2' ]
      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(2);
      expect(mockReadFileSync).toBeCalledTimes(2);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('The Atlassian Plugin project does not contain an AMPS configuration, unable to detect product 😰');
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandExecutionOptions[command],
        activateProfiles: 'active1,active2'
      });
    });

    /*
      The pom file does not have a version in any of the activated profiles

      Test the default command without providing arguments and with a pom.xml
      file present that has an Atlassian packaging and an multiple active profiles
      with none of them having a valid AMPS configurations with supported products
    */

    it('The pom file does not have a version in any of the activated profiles', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithMultipleActiveProfilesWithASingleProductWithoutVersion);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      process.argv = [ 'vitest', 'dcdx', '-P', 'active1,active2' ]
      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(3);
      expect(mockReadFileSync).toBeCalledTimes(3);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('Failed to determine version from AMPS and no product version provided (--tag)');
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandExecutionOptions[command],
        activateProfiles: 'active1,active2'
      });
    });

    /*
      The pom file does not have a supported version in any of the activated profiles

      Test the default command without providing arguments and with a pom.xml
      file present that has an Atlassian packaging and an multiple active profiles
      with none of them having a valid AMPS configurations with supported products
    */

    it('The pom file does not have a supported version in any of the activated profiles', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithMultipleActiveProfilesWithASingleProductWithoutValidVersion);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      process.argv = [ 'vitest', 'dcdx', '-P', 'active1,active2' ]
      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain(`Product version '1000.000.000' is invalid.`);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandExecutionOptions[command],
        activateProfiles: 'active1,active2'
      });
    });

    /*
      The pom file has incorrect property replacement for the version in any of the activated profiles

      Test the default command without providing arguments
      and with a pom.xml file present that is an Atlassian Plugin
      and has multiple active profiles with an AMPS plugin with a <productVersion/> element
      that uses a property that cannot be resolved during property replacement
    */

    it('The pom file has incorrect property replacement for the version in any of the activated profiles', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithMultipleActiveProfilesAndVersionWithIncorrectPropertyReplacement);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      process.argv = [ 'vitest', 'dcdx', '-P', 'active1,active2' ]
      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain(`Product version '\${invalidProperty}' is invalid.`);
      expect(commandExecutionOptions).toStrictEqual({
        ...defaultCommandExecutionOptions[command],
        activateProfiles: 'active1,active2'
      });
    });

    /*
      The pom file has multiple AMPS configurations in multple activated profiles

      Test the default command without providing arguments and with a pom.xml
      file present that has an Atlassian packaging and an active profile
      that has that has multiple valid AMPS configurations
    */

    it('The pom file has multiple AMPS configurations in multple activated profiles', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.pomFileWithMultipleActiveProfilesWithMultipleProducts);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      process.argv = [ 'vitest', 'dcdx', '-P', 'active1,active2' ]
      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(2);
      expect(mockReadFileSync).toBeCalledTimes(2);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('The Atlassian Plugin project contains multiple AMPS configuration, unable to decide which product to use 😰');
      expect(commandExecutionOptions).toStrictEqual({ ...defaultCommandExecutionOptions[command], activateProfiles: 'active1,active2' });
    });

    /******************************************************************************
     *
     *  POM FILES WITH LEGACY AMPS PLUGINS
     *
     ******************************************************************************/

    /*
      The pom file does not have a supported AMPS product (legacy)

      Test the default command without providing arguments
      and with a pom.xml file present that is an Atlassian Plugin
      but does not contain a supported AMPS plugin (legacy)
    */

    it('The pom file does not have a supported AMPS product (legacy)', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.legacyPomFileWithInvalidProduct);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(4);
      expect(mockReadFileSync).toBeCalledTimes(4);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('The Atlassian Plugin project does not contain an AMPS configuration, unable to detect product 😰');
      expect(commandExecutionOptions).toStrictEqual(defaultCommandExecutionOptions[command]);
    });

    /*
      The pom file does not have a version (legacy)

      Test the default command without providing arguments
      and with a pom.xml file present that is an Atlassian Plugin
      and has an AMPS plugin but without a <version /> element (legacy)
    */

    it('The pom file does not have a version (legacy)', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.legacyPomFileWithProductButWithoutVersion);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(3);
      expect(mockReadFileSync).toBeCalledTimes(3);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('Failed to determine version from AMPS and no product version provided (--tag)');
      expect(commandExecutionOptions).toStrictEqual(defaultCommandExecutionOptions[command]);
    });

    /*
      The pom file does not have a supported version (legacy)

      Test the default command without providing arguments
      and with a pom.xml file present that is an Atlassian Plugin
      and has an AMPS plugin but without a <version/> element (legacy)
    */

    it('The pom file does not have a supported version (legacy)', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.legacyPomFileWithProductButWithInvalidVersion);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain(`Product version '1000.000.000' is invalid.`);
      expect(commandExecutionOptions).toStrictEqual(defaultCommandExecutionOptions[command]);
    });

    /*
      The pom file has incorrect property replacement for the version (legacy)

      Test the default command without providing arguments
      and with a pom.xml file present that is an Atlassian Plugin
      and has an AMPS plugin with a <version /> element that
      uses a property that cannot be resolved during property replacement (legacy)
    */

    it('The pom file has incorrect property replacement for the version (legacy)', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.legacyPomFileWithProductAndVersionWithIncorrectPropertyReplacement);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(7);
      expect(mockReadFileSync).toBeCalledTimes(7);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain(`Product version '\${invalidProperty}' is invalid.`);
      expect(commandExecutionOptions).toStrictEqual(defaultCommandExecutionOptions[command]);
    });

    /*
      The pom file has multiple AMPS configurations (legacy)

      Test the default command without providing arguments
      and with a pom.xml file present that has an Atlassian packaging
      but has multiple AMPS configurations
    */

    it('The pom file has multiple AMPS configurations (legacy)', async () => {
      let stdOut = '';
      let stdErr = '';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(pomFiles.legacyPomFileWithMultipleProducts);
      vi.spyOn(stdout, 'write').mockImplementation((value) => { stdOut += value; return true; });
      vi.spyOn(stderr, 'write').mockImplementation((value) => { stdErr += value; return true; });

      await import(`../src/commands/${command}`);

      expect(mockedDockerCompose).toBeCalledTimes(0);
      expect(mockExistsSync).toBeCalledTimes(6);
      expect(mockReadFileSync).toBeCalledTimes(6);

      expect(stdOut).toContain(
        command === 'build' || command === 'debug'
          ? 'Successfully stopped all running processes 💪'
          : ''
      );
      expect(stdErr).toContain('The Atlassian Plugin project contains multiple AMPS configuration, unable to decide which product to use 😰');
      expect(commandExecutionOptions).toStrictEqual(defaultCommandExecutionOptions[command]);
    });
  });
});
