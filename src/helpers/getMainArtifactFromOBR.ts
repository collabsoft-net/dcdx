import { existsSync, rmSync } from 'fs';
import { glob } from 'glob';
import { homedir } from 'os';
import { basename, join } from 'path';
import { Open } from 'unzipper';


export const getMainArtifactFromOBR = async (path: string, verbose?: boolean) => {
  // Placeholder for temporary directory
  const tmpDir = join(homedir(), '.dcdx', 'tmp');

  // Placeholder for archive directory
  const archiveDir = join(tmpDir, basename(path));

  // Let the user know we are going to process this OBR
  verbose && console.log('The archive is an OSGi Bundle Repository (OBR)');
  verbose && console.log('Searching for the main artifact');

  // Remove the temporary directory
  rmSync(archiveDir, { recursive: true, force: true });

  // Extract the file to a temporary directory
  verbose && console.log(`Extracting archive to a temporary location (${archiveDir})`);
  const archive = await Open.file(path);
  await archive.extract({ path: archiveDir })

  // Make sure that we are dealing with an OBR file
  if (!existsSync(join(archiveDir, 'obr.xml'))) {
    throw new Error('File is not a valid OBR');
  }

  // Get the main JAR file (which is located in the root directory)
  const [ relativePathToJar ] = await glob(`*.jar`, { cwd: archiveDir });

  // Make sure we actually found the main jar
  if (!relativePathToJar) {
    throw new Error('Failed to locate the main JAR file in the archive');
  } else {
    verbose && console.log(`Found the main artifact (${relativePathToJar})`);

    // Return the full path to the JAR file
    return join(archiveDir, relativePathToJar);
  }
}