import { spawn } from 'child_process';
import Dockerode from 'dockerode';
import { cwd } from 'process';

import { TSupportedApplications } from '../types/Application';

const docker = new Dockerode();

export const getRunningContainerIds = async (application: TSupportedApplications) => {
  const containers = await docker.listContainers({ filters: {
    status: [ 'running' ],
    label: [ `com.docker.compose.service=${application}` ]
  }});
  return containers.map(item => item.Id);
}

export const copy = async (sourcePath: string, destinationPath:string) => {
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