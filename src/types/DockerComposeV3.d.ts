
export {}

export type DockerComposeV3 = {

  version: string;
  services: Record<string, Service>;
  volumes?: Record<string, Volume>;
  networks?: Record<string, Network>;
  configs?: Record<string, FileConfig|ExternalConfig>;
  secrets?: Record<string, FileSecret|ExternalSecret>;
}

export type Service = {
  build?: string|Build;
  cap_add?: Array<string>;
  cap_drop?: Array<string>;
  cgroup_parent?: string;
  command?: string|Array<string>;
  config?: Array<string>|Array<Config>;
  container_name?: string;
  credential_spec?: FileCredentialSpec|RegistryCredentialSpec|ConfigCredentialSpec;
  depends_on?: Array<string>;
  deploy?: Deploy;
  devices?: Array<string>;
  dns?: string|Array<string>;
  dns_serach?: string|Array<string>;
  entrypoint?: string|Array<string>;
  env_file?: string|Array<string>;
  environment?: Array<string>|Record<string, string>;
  expose?: Array<string>;
  external_links?: Array<string>;
  extra_hosts?: Array<string>;
  healthcheck?: Healthcheck;
  image?: string;
  init?: boolean;
  isolation?: 'default'|'process'|'hyperv';
  labels?: Array<string>|Record<string, string>;
  links?: Array<string>;
  logging?: Logging;
  network_mode?: 'bridge'|'host'|'none'|string;
  networks?: Array<string>|Record<string, NetworkLongSyntax>;
  pid?: 'host';
  ports?: Array<string>|Array<Port>;
  profiles?: Array<string>;
  restart?: 'no'|'always'|'on-failure'|'unless-stopped';
  secrets?: Array<string>|Array<SecretLongSyntax>;
  security_opt?: Array<string>;
  stop_grace_period?: string;
  stop_signal?: string;
  sysctls?: Array<string>|Record<string, string>;
  tmpfs?: string|Array<string>;
  ulimits?: ULimits;
  userns_mode?: 'host';
  volumes?: Array<string>|Array<VolumeLongSyntax>;
  user?: string;
  working_dir?: string;
  domainname?: string;
  hostname?: string;
  ipc?: string;
  mac_address?: string;
  privileged?: boolean;
  read_only?: boolean;
  shm_size?: string;
  stdin_open?: boolean;
  tty?: boolean;
}

export type Build = {
  context: string;
  dockerfile?: string;
  dockerfile_inline?: string;
  args?: Array<string>|Record<string, string>;
  cache_from?: Array<string>;
  labels?: Array<string>|Record<string, string>;
  network?: string;
  shm_size?: string|number;
  target?: string;
}

export type Config = {
  source: string;
  target?: string;
  uid?: string;
  gid?: string;
  mode?: string;
}

export type FileCredentialSpec = {
  file: string;
}

export type RegistryCredentialSpec = {
  registry: string;
}

export type ConfigCredentialSpec = {
  config: string;
}

type Deploy = {
  endpoint_mode?: 'vip'|'dnsrr';
  labels?: Record<string, string>;
  mode?: 'global'|'replicated';
  placement?: Placement;
  replicas?: number;
  resources?: Resources;
  restart_policy?: RestartPolicy;
  rollback_config?: RollbackConfig;
  update_config?: UpdateConfig;
}

export type Placement = {
  constraints?: Array<string>;
  preferences?: Record<string, string>;
  max_replicas_per_node?: number;
}

export type Resources = {
  limits?: Resource;
  reservations?: Resource
}

export type Resource = {
  cpus?: string;
  memory?: string;
}

export type RestartPolicy = {
  condition?: 'none'|'on-failure'|'any';
  delay?: string;
  max_attempts?: number;
  window?: string;
}

export type RollbackConfig = {
  parallelism?: number;
  delay?: string;
  failure_action?: 'continue'|'pause';
  monitor?: string;
  max_failure_ratio?: number;
  order?: 'stop-first'|'start-first';
}

export type UpdateConfig = {
  parallelism?: number;
  delay?: string;
  failure_action?: 'continue'|'pause';
  monitor?: string;
  max_failure_ratio?: number;
  order?: 'stop-first'|'start-first';
}

export type Healthcheck = {
  disable?: boolean;
  test?: string|Array<string>;
  interval?: string;
  timeout?: string;
  retries?: number;
  start_period?: string;
}

export type Logging = {
  driver?: 'json-file'|'syslog'|'none'|string;
  options?: Record<string, string>;
}

export type NetworkLongSyntax = {
  aliases?: Array<string>;
  ipv4_address?: string;
  ipv6_address?: string;
}

export type Port = {
  target: string;
  published?: string;
  protocol?: 'tcp'|'udp';
  mode?: 'host'|'ingress';
}

export type SecretLongSyntax = {
  source: string;
  target?: string;
  uid?: string;
  gid?: string;
  mode?: string;
}

export type ULimits = {
  nproc?: number;
  nofile?: ULimitsNoFile;
}

export type ULimitsNoFile = {
  soft?: number;
  hard?: number;
}

export type VolumeLongSyntax = {
  type: 'volume'|'bind'|'tmpfs'|'npipe';
  source?: string;
  target?: string;
  read_only?: boolean;
  bind?: {
    propagation: string;
  };
  volume?: {
    nocopy: boolean;
  }
  tmpfs?: {
    size: number;
  }
}

export type Volume = {
  driver?: string;
  driver_opts?: Record<string, string>;
  external?: boolean|ExternalVolume;
  labels?: Array<string>|Record<string, string>;
  name?: string;
}

export type ExternalVolume = {
  name: string;
}

export type Network = {
  driver?: 'bridge'|'overlay'|string;
  driver_opts?: Record<string, string>;
  attachable?: boolean;
  enable_ipv6?: boolean;
  ipam?: IPAM;
  internal?: boolean;
  labels?: Array<string>|Record<string, string>;
  external?: boolean;
  name?: string;
}

export type IPAM = {
  driver: 'default'|string;
  config: Record<'subnet', string>;
}

export type FileConfig = {
  file: string;
  name?: string;
  driver?: string;
  driver_opts?: Record<string, string>;
  template_driver?: 'golang';
}

export type ExternalConfig = {
  external: true;
  name?: string;
  driver?: string;
  driver_opts?: Record<string, string>;
  template_driver?: 'golang';
}

export type FileSecret = {
  file: string;
  name?: string;
  template_driver?: 'golang';
}

export type ExternalSecret = {
  external: true;
  name?: string;
  template_driver?: 'golang';
}
