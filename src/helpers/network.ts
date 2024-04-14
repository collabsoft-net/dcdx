import type { Network } from '../types/DockerComposeV3';


export const network: Network = {
  name: 'shared',
  driver: 'bridge'
}