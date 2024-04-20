import { spawn } from 'child_process';
import Dockerode from 'dockerode';
import { cwd } from 'process';

import { SupportedApplications } from '../types/SupportedApplications';

const docker = new Dockerode();

export class Docker {

  public static async getRunningContainerIds(application: SupportedApplications) {
    const containers = await docker.listContainers({ filters: {
      status: [ 'running' ],
      label: [ `com.docker.compose.service=${application}` ]
    }});
    return containers.map(item => item.Id);
  }

  public static async copy(sourcePath: string, destinationPath:string) {
    return new Promise<void>((resolve, reject) => {
      const docker = spawn(
        'docker',
        [ 'cp', sourcePath, destinationPath ],
        { cwd: cwd(), stdio: 'inherit' }
      );
      docker.on('error', reject)
      docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
    });
  }

}