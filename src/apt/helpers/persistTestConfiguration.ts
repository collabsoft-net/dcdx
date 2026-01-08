import { join } from 'path';

import { replaceLinesInFile } from '../../helpers/replaceLinesInFile';
import { TSupportedApplications } from '../../types/Application';
import { waitForUserInput } from './waitForUserInput';

export const persistTestConfiguration = async (cwd: string, product: TSupportedApplications, baseUrl: string, duration: string, useJMeter?: boolean, useLocust?: boolean, force?: boolean) => {
  const productURI = new URL(baseUrl);
  const protocol = productURI.protocol.startsWith('https') ? 'https' : 'http';
  const port = protocol === 'http' ? '80' : '443';

  console.log(`
  The following information will be updated in the ${product}.yml file:

  application_hostname = ${productURI.host}
  application_protocol = ${protocol}
  application_port = ${port}
  application_postfix = ${productURI.pathname}
  test_duration = ${duration}
  load_executor = ${useLocust ? 'locust' : 'jmeter'}
  standalone_extension = ${useLocust || useJMeter ? '1' : '0'}

  The configuration will be written to disk and overwrite existing configuration:
  ${join(cwd, 'app', `${product}.yml`)}
`);

  await waitForUserInput('Press a key to continue...', force);

  replaceLinesInFile(join(cwd, 'app', `${product}.yml`), (line) => {
    if (line.startsWith('    application_hostname:')) {
      return `    application_hostname: ${productURI.host}`
    } else if (line.startsWith('    application_protocol:')) {
      return `    application_protocol: ${protocol}`;
    } else if (line.startsWith(`    application_port:`)) {
      return `    application_port: ${port}`
    } else if (line.startsWith(`    load_executor:`)) {
      return `    load_executor: ${useLocust ? 'locust' : 'jmeter'}`;
    } else if (line.startsWith(`    standalone_extension:`)) {
      return `    standalone_extension: ${useLocust || useJMeter ? '1' : '0'}`;
    } else if (line.startsWith(`    test_duration:`)) {
      return `    test_duration: ${duration}`;
    }
    return line;
  })

  console.log(`
✔ Configuration written to ${product}.yml`);
}