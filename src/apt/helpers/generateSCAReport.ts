import { spawn } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { glob } from 'glob';
import { homedir } from 'os';
import { basename, join, resolve } from 'path';
import { Open } from 'unzipper';

import { TAPTSCAOptions } from '../../types/DCAPT';
import { downloadFile } from './downloadFile';
import { getUrlByAppKey } from './getUrlByAppKey';

export const generateSCAReport = async (options: TAPTSCAOptions) => {

  // Placeholder for temporary directory
  const tmpDir = join(homedir(), '.dcdx', 'tmp');

  // Placeholder for archive directory
  const archiveDir = join(tmpDir, `.${options.appKey}`);

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

  // Make sure that we have a valid path to the JAR file
  if (!file || !existsSync(resolve(file))) {
    console.log(`Unable to locate the archive in path ${file}`)
    return;
  }

  if (file.endsWith('.obr')) {
    console.log('The archive is an OSGi Bundle Repository (OBR)');
    console.log(`Extracting archive to a temporary location (${archiveDir})`);

    const archive = await Open.file(file);
    await archive.extract({ path: archiveDir })

    // Get the main JAR file (which is located in the root directory)
    const [ relativePathToJar ] = await glob(`*.jar`, { cwd: archiveDir });

    // Make sure we actually found the main jar
    if (!relativePathToJar) {
      console.log('Failed to locate the main JAR file in the archive');
      return;
    } else {
      console.log(`Found the main artifact (${relativePathToJar})`);

      // Get the full path to the JAR file
      file = join(archiveDir, relativePathToJar);
    }
  }

  // Create the output directory
  mkdirSync(options.outputDir, { recursive: true });

  try {
    console.log('Running OWASP dependency-check with the following arguments:')
    console.log(`owasp/dependency-check --nvdApiKey ${options.nvdApiKey} --failOnCVSS 0 --scan ${file} --suppression https://dcapt-downloads.s3.amazonaws.com/atlassian-security-scanner-dc-apps-suppressions.xml --out ${options.outputDir}`);

    await new Promise<void>((resolve, reject) => {
      const docker = spawn(
        'docker',
        [
          'run',
          `--pull=always`,
          '-u', '0:0',
          '-e', 'user=root',
          '-v', `${file}:/src/${basename(file)}`,
          ...options.dataDir ? [ '-v', `${options.dataDir}:/usr/share/dependency-check/data` ] : [],
          '-v', `${options.outputDir}:/report`,
          'owasp/dependency-check',
          ...options.failOnError ? [ '--failOnCVSS', '0' ] : [],
          '--nvdApiKey', `${options.nvdApiKey}`,
          '--scan', `/src`,
          '--suppression', 'https://dcapt-downloads.s3.amazonaws.com/atlassian-security-scanner-dc-apps-suppressions.xml',
          '--out', '/report'
        ],
        { stdio: 'inherit' }
      );
      docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
    });

    console.log(`✔ Finished running the OWASP dependency check software composition analysis (SCA) scanner`);
  } finally {
    rmSync(archiveDir, { recursive: true, force: true });

    // Only remove the file if we downloaded it from MPAC
    if (!options.archive && file) {
      rmSync(file, { force: true });
    }
  }
}