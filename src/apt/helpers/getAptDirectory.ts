import { confirm, input } from '@inquirer/prompts';
import { existsSync, rmSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { cwd as pwd } from 'process';
import simpleGit from 'simple-git';

import { emptyLine } from '../messages';

export const getAptDictory = async (cwd: string, mustUseDefaultConfiguration: boolean, force?: boolean) => {
  // Translate common relative paths to absolute paths
  let result: string = cwd.startsWith('~/')
    ? cwd.replace('~/', homedir())
    : cwd.startsWith('./')
      ? cwd.replace('./', pwd() + '/')
      : cwd === '.'
        ? pwd()
        : cwd;

  // If we are in interactive mode, we should ask questions first
  if (!force) {

    // Check if we are currently in the APT directory
    const isCurrentDirectoryEligable = existsSync(join(cwd, 'app/util/k8s/dcapt.tfvars'));

    // If this is the APT directory, we will be using the current directory...
    let useCurrentDirectory: boolean = isCurrentDirectoryEligable;

    // ...unless told otherwise
    if (isCurrentDirectoryEligable) {
      console.log(`  We've found the App Performance Toolkit in the specified directory:
  ${cwd}
`)
      useCurrentDirectory = await confirm({
        message: `Do you wish to use this directory?`,
        default: true,
      });
    }

    // If we are not going to use the current directory, ask for the alternative
    let directory = cwd;
    if (!useCurrentDirectory) {
      directory = await input({
        message: 'Please specify the location where the App Peformance Toolkit is located',
        default: cwd,
        required: true
      });
    }

    // Translate common relative paths to absolute paths
    directory = directory.startsWith('~/')
      ? directory.replace('~/', homedir() + '/')
      : directory.startsWith('./')
        ? directory.replace('./', pwd() + '/')
        : directory === '.'
          ? pwd()
          : directory;

    // Check if the provided alternative is a DCAPT directory
    const isDirectoryEligable = existsSync(resolve(join(directory, 'app/util/k8s/dcapt.tfvars')));
    if (!isDirectoryEligable) {

      // If it is not a DCAPT directory, ask if we need to clone it from Github
      const mustCloneAPT = await confirm({
        message: `The directory either doesn't exist, or it doesn't contain the App Peformance Toolkit. Do you want to clone DCAPT from source?`,
      });

      // If we must clone it from Github, we should clone it from Github
      if (mustCloneAPT) {
        await simpleGit().clone('https://github.com/atlassian/dc-app-performance-toolkit.git', directory);
      }
    }

    // Check if this needs to be a default configuration (for performance regression testing)
    if (mustUseDefaultConfiguration) {

      // Ask nicely...
      const isDefaultConfiguration = await confirm({
        message: 'Please confirm that the chosen directory is using the default configuration for DCAPT (master branch)'
      });

      // ...but also, No is not an option
      if (!isDefaultConfiguration) {
        throw new Error('It is required to use the default configuration from master to continue');
      }
    } else {

      // Ask nicely...
      const isAppSpecificConfiguration = await confirm({
        message: 'Please confirm that the chosen directory has a DCAPT installation with app-specific actions'
      });

      // ...but also, No is not an option
      if (!isAppSpecificConfiguration) {
        throw new Error('It is required to have app-specific actions in order to continue');
      }
    }

    // Set the result to the provided directory
    result = directory;

  // If we are in non-interactive mode and we need to use the default configuration, we will clone it from Github
  } else if (mustUseDefaultConfiguration) {

    if (cwd.endsWith('.dcdx/dcapt')) {
      console.log('  Using default configuration of DCAPT from source (non-interactive mode)')
      console.log(`  ${cwd}`);
      emptyLine();

      return cwd;
    }

    // If the provided directory does not exists we can use it
    // Otherwise use a temporary directory to ensure a fresh non-persistent checkout
    result = !existsSync(cwd)
      ? cwd
      : join(homedir(), '.dcdx', 'dcapt');

    // Inform the user of the chosen directory
    console.log('  Installing default configuration of DCAPT from source (non-interactive mode)')
    console.log(`  ${result}`);

    // Make sure the directory is empty
    rmSync(result, { force: true, recursive: true });

    // Retrieve DCAPT from github
    await simpleGit().clone('https://github.com/atlassian/dc-app-performance-toolkit.git', result);

    console.log('✔ Finished installing default configuration of DCAPT from source (non-interactive mode)')

  // If we are in non-interactive mode and we need to use app specific configuration, make sure that it exists
  } else {

    // Check if we are currently in the APT directory
    const isCurrentDirectoryEligable = existsSync(join(cwd, 'app/util/k8s/dcapt.tfvars'));

    // If this is not a DCAPT directory, we cannot continue
    if (!isCurrentDirectoryEligable) {
      throw new Error(`Could not find App Performance Toolkit in the current directory ${cwd}`);
    }

    console.log('  Using DCAPT from current directory (non-interactive mode)')
    console.log(`  ${cwd}`);
    emptyLine();
    result = cwd;

  }

  // This should not occur, because either we have established the current directory has DCAPT
  // or we have cloned it into a (new) directory. This is merely a check for if the latter failed.
  if (!existsSync(join(result, 'app/util/k8s/dcapt.tfvars'))) {
    throw new Error(`Could not find the App Performance Toolkit in the provided directory ${result}`);
  }

  // Some additional checks to ensure that we are in a valid DCAPT directory
  const hasEnvFile = existsSync(join(result, 'app/util/k8s/aws_envs'));
  const hasSnapshotJSON = existsSync(join(result, 'app/util/k8s/dcapt-snapshots.json'));
  const hasTerraformVariables = existsSync(join(result, 'app/util/k8s/dcapt.tfvars'));

  if (!hasEnvFile) {
    throw new Error(`Could not find the required 'aws_ens' file. Expected to find it in ${join(result, 'app/util/k8s/aws_envs')}`);
  } else if (!hasSnapshotJSON) {
    throw new Error(`Could not find the required 'dcapt-snapshots.json' file. Expected to find it in ${join(result, 'app/util/k8s/dcapt-snapshots.json')}`);
  } else if (!hasTerraformVariables) {
    throw new Error(`Could not find the required 'dcapt.tfvars' file. Expected to find it in ${join(result, 'app/util/k8s/dcapt.tfvars')}`);
  }

  return result;
}