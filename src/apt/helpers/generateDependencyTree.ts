import { spawn } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { glob } from 'glob';
import { homedir } from 'os';
import { basename, join } from 'path';
import { Open } from 'unzipper';

import { TAPTDependencyTreeOptions } from '../../types/DCAPT';
import { downloadApp } from './downloadApp';

export const generateDependencyTree = async (options: TAPTDependencyTreeOptions) => {

  // Placeholder for temporary directory
  const tmpDir = join(homedir(), '.dcdx', 'tmp');

  // Download the file from MPAC
  console.log('Downloading archive from the Atlassian Marketplace');
  const file = await downloadApp(options.appKey);

  try {
    // Placeholder for archive directory
    const archiveDir = join(tmpDir, `.${options.appKey}`);

    try {
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
          const [ relativePathToPOM ] = await glob(`META-INF/maven/**/pom.xml`, { cwd: jarDir });

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
          console.log(`Searching for POM file in the artifact`);
          const [ relativePathToPOM ] = await glob(`META-INF/maven/**/pom.xml`, { cwd: archiveDir });

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
    rmSync(file, { force: true });
  }
}