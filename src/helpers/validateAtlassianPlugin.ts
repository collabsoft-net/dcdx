import { XMLParser } from 'fast-xml-parser';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { homedir } from 'os';
import { basename, join } from 'path';
import { Open } from 'unzipper';

import { getMainArtifactFromOBR } from './getMainArtifactFromOBR';

export const validateAtlassianPlugin = async (path: string, verbose?: boolean) => {

  // Placeholder for the result
  let result = path;

  // Check if this is a JAR file or OBR
  const ext = result.split('.').pop();

  if (!ext || (ext.toLowerCase() !== 'jar' && ext.toLowerCase() !== 'obr')) {
    throw new Error('File is neither JAR file or OBR. Only valid plugin archive types can be installed');
  }

  // Check if we are dealing with an OBR file, and if so, get the main artifact
  if (ext.toLowerCase() === 'obr') {
    result = await getMainArtifactFromOBR(result, verbose);
  }

  // Placeholder for temporary directory
  const tmpDir = join(homedir(), '.dcdx', 'tmp');

  // Placeholder for archive directory
  const archiveDir = join(tmpDir, basename(path, '.' + ext));

  // Make sure the archive directory exists and is empty
  rmSync(archiveDir, { recursive: true, force: true });
  mkdirSync(archiveDir, { recursive: true });

  // Extract the main JAR file into the placeholder directory
  const archive = await Open.file(result);
  await archive.extract({ path: archiveDir });

  // Get path to atlassian-plugin.xml
  const atlassianPluginXML = join(archiveDir, 'atlassian-plugin.xml');

  // Check if this is a valid Atlassian P2 plugin archive
  if (!existsSync(atlassianPluginXML)) {
    throw new Error('Archive is not a valid Atlassian plugin');
  }

  try {
    const xml = readFileSync(atlassianPluginXML, 'utf8');
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '_' });
    const doc = parser.parse(xml);

    return {
      appKey: doc['atlassian-plugin']._key,
      path: result,
    }
  } catch {
    throw new Error('Failed to determine validity of atlassian-plugin.xml');
  }
}

