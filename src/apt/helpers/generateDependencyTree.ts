import { spawn } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { glob } from 'glob';
import { homedir } from 'os';
import { basename, join, resolve } from 'path';
import { Open } from 'unzipper';

import { findInFile } from '../../helpers/findInFile';
import { TAPTDependencyTreeOptions } from '../../types/DCAPT';
import { downloadFile } from './downloadFile';
import { getUrlByAppKey } from './getUrlByAppKey';

export const generateDependencyTree = async (options: TAPTDependencyTreeOptions) => {

  // Placeholder for temporary directory
  const tmpDir = join(homedir(), '.dcdx', 'tmp');

  // Placeholder for the path to the JAR file
  let file = options.archive;

  // Check if we need to download the file based on the appKey
  // If both archive and appKey were provided, we will use the archive
  if (!options.archive && options.appKey) {
    // Get the download URL based on the appKey
    const url = await getUrlByAppKey(options.appKey);

    // Download the file from MPAC
    console.log('Downloading archive from the Atlassian Marketplace');
    file = await downloadFile(url);
  }

  try {
    // Placeholder for archive directory
    const archiveDir = join(tmpDir, `.${options.groupId}.${options.artifactId}`);

    try {
      // Make sure that we have a valid path to the JAR file
      if (!file || !existsSync(resolve(file))) {
        console.log(`Unable to locate the archive in path ${file}`)
        return;
      }

      // Extract the file to a temporary directory
      console.log(`Extracting archive to a temporary location (${archiveDir})`);
      const archive = await Open.file(file);
      await archive.extract({ path: archiveDir })

      // Check if we are dealing with an OBR file
      if (existsSync(join(archiveDir, 'obr.xml'))) {

        console.log('The archive is an OSGi Bundle Repository (OBR)');
        console.log('Searching for the main artifact');

        // Get the main JAR file (which is located in the root directory)
        const [ relativePathToJar ] = await glob(`*.jar`, { cwd: archiveDir });

        // Make sure we actually found the main jar
        if (!relativePathToJar) {
          console.log('Failed to locate the main JAR file in the archive');
          return;
        } else {
          console.log(`Found the main artifact (${relativePathToJar})`);

          // Get the full path to the JAR file
          const jarFile = join(archiveDir, relativePathToJar);

          // Placeholder directroy in which we will be extracting the main JAR
          const jarDir = join(archiveDir, basename(jarFile, '.jar'));

          // Extract the main JAR file into the placeholder directory
          console.log(`Extracting the main artifact to a temporary location (${jarDir})`);
          const archive = await Open.file(jarFile);
          await archive.extract({ path: jarDir });

          // Now try to find the POM file for the main JAR
          console.log(`Searching for POM file in the main artifact`);
          const pomFiles = await glob(`META-INF/maven/**/pom.xml`, { cwd: jarDir });

          const relativePathToPOM = pomFiles.find(path => {
            const pomFile = join(jarDir, path);
            return findInFile(pomFile, [
              `<groupId>${options.groupId}</groupId>`,
              `<artifactId>${options.artifactId}</artifactId>`
            ]);
          });

          // Make sure we have found the POM file
          if (!relativePathToPOM) {
            console.log('Failed to locate the POM file in the main artifact');
            return;
          } else {
            console.log(`Found the POM file`);

            // Get the full path to the POM file
            const pomFile = join(jarDir, relativePathToPOM);

            // Ask Maven to generate the depdency tree graph!
            console.log('Asking Apache Maven to generate the dependency graph');
            await new Promise<void>((resolve, reject) => {
              const maven = spawn(
                'mvn',
                [
                  'dependency:tree',
                  '-f', pomFile,
                  '-DoutputType=dot',
                  `-DoutputFile=${options.outputFile}`,
                ],
                { stdio: 'inherit' }
              );
              maven.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Apache Maven exited with code ${code}`)));
            });

            console.log('Finished generating the dependency graph');
          }
        }

      // This is actually already the main JAR file
      } else {

          // Now try to find the POM file for the main JAR
          console.log(`Searching for POM file in the main artifact`);
          const pomFiles = await glob(`META-INF/maven/**/pom.xml`, { cwd: archiveDir });

          const relativePathToPOM = pomFiles.find(path => {
            const pomFile = join(archiveDir, path);
            return findInFile(pomFile, [
              `<groupId>${options.groupId}</groupId>`,
              `<artifactId>${options.artifactId}</artifactId>`
            ]);
          });

          // Make sure we have found the POM file
          if (!relativePathToPOM) {
            console.log('Failed to locate the POM file in the artifact');
            return;
          } else {
            console.log(`Found the POM file`);

            // Get the full path to the POM file
            const pomFile = join(archiveDir, relativePathToPOM);

            // Ask Maven to generate the depdency tree graph!
            console.log('Asking Apache Maven to generate the dependency graph');
            await new Promise<void>((resolve, reject) => {
              const maven = spawn(
                'mvn',
                [
                  ...options.activateProfiles ? [ '-P', options.activateProfiles ] : [],
                  'dependency:tree',
                  '-f', pomFile,
                  '-DoutputType=dot',
                  `-DoutputFile=${options.outputFile}`,
                ],
                { stdio: 'inherit' }
              );
              maven.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Apache Maven exited with code ${code}`)));
            });

            console.log('Finished generating the dependency graph');
          }
      }
    } finally {
      rmSync(archiveDir, { force: true, recursive: true });
    }
  } finally {
    // Only remove the file if we downloaded it from MPAC
    if (!options.archive && file) {
      rmSync(file, { force: true });
    }
  }
}