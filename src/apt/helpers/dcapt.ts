import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join, resolve } from 'path';

import { TSupportedApplications } from '../../types/Application';


export const install = async (cwd: string) => {
  console.log(`
  Start provisioning AWS using the Atlassian Data Center App Performace Toolkit (DCAPT) Terraform configuration
`);

  const baseDir = join(cwd, 'app/util/k8s');
  writeFileSync(join(baseDir, 'outputs.json'), '# terraform output', 'utf-8');

  await new Promise<void>((resolve, reject) => {
    const docker = spawn(
      'docker',
      [
        'run',
        '-it',
        `--pull=always`,
        '--env-file', 'aws_envs',
        '-v', `${baseDir}/dcapt.tfvars:/data-center-terraform/conf.tfvars`,
        '-v', `${baseDir}/dcapt-snapshots.json:/data-center-terraform/dcapt-snapshots.json`,
        '-v', `${baseDir}/logs:/data-center-terraform/logs`,
        '-v', `${baseDir}/outputs.json:/data-center-terraform/outputs.json`,
        'atlassianlabs/terraform:2.7.9',
        './install.sh', '-c', 'conf.tfvars'
      ],
      { cwd: baseDir, stdio: 'inherit' }
    );
    docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
  });

  console.log(`
✔ Finished provisioning AWS using the Atlassian Data Center App Performace Toolkit (DCAPT) Terraform configuration`);
}

export const runTest = async (cwd: string, environment: string, product: TSupportedApplications) => {
  await new Promise<void>((resolve, reject) => {
    const docker = spawn(
      'docker',
      [
        'run',
        '-it',
        `--pull=always`,
        '--env-file', './app/util/k8s/aws_envs',
        '-e', `REGION=us-east-2`,
        '-e', `ENVIRONMENT_NAME=${environment}`,
        '-v', `${cwd}:/data-center-terraform/dc-app-performance-toolkit`,
        '-v', `${cwd}/app/util/k8s/bzt_on_pod.sh:/data-center-terraform/bzt_on_pod.sh`,
        'atlassianlabs/terraform:2.7.9',
        'bash', 'bzt_on_pod.sh', `${product}.yml`
      ],
      { cwd, stdio: 'inherit' }
    );
    docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
  });
}

export const regressionReport = async (cwd: string, run1Dir: string, run2Dir: string) => {
  await new Promise<void>((resolve, reject) => {
    const docker = spawn(
      'docker',
      [
        'run',
        '-it',
        `--pull=always`,
        '--workdir', '//dc-app-performance-toolkit/app/reports_generation',
        '--entrypoint', 'python',
        '-v', `${cwd}:/dc-app-performance-toolkit`,
        '-v', `${run1Dir}:/results/run1`,
        '-v', `${run2Dir}:/results/run2`,
        'atlassian/dcapt',
        'csv_chart_generator.py', 'performance_profile.yml'
      ],
      { cwd, stdio: 'inherit' }
    );
    docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
  });

  console.log(`✔ Finished generating the Performance Regression Report`);
}

export const scalabilityReport = async (cwd: string, run3Dir: string, run4Dir: string, run5Dir: string) => {
  await new Promise<void>((resolve, reject) => {
    const docker = spawn(
      'docker',
      [
        'run',
        '-it',
        `--pull=always`,
        '--workdir', '//dc-app-performance-toolkit/app/reports_generation',
        '--entrypoint', 'python',
        '-v', `${cwd}:/dc-app-performance-toolkit`,
        '-v', `${run3Dir}:/results/run3`,
        '-v', `${run4Dir}:/results/run4`,
        '-v', `${run5Dir}:/results/run5`,
        'atlassian/dcapt',
        'csv_chart_generator.py', 'scale_profile.yml'
      ],
      { cwd, stdio: 'inherit' }
    );
    docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
  });

  console.log(`✔ Finished generating the Scalability Benchmark Report`);
}

export const terminate = async (cwd: string, environment: string) => {
  const baseDir = resolve(join(cwd, 'app/util/k8s'));
  await new Promise<void>((resolve, reject) => {
    const docker = spawn(
      'docker',
      [
        'run',
        `--pull=always`,
        '--env-file', 'aws_envs',
        '--workdir', '//data-center-terraform',
        '--entrypoint', 'python',
        '-v', `${baseDir}/terminate_cluster.py:/data-center-terraform/terminate_cluster.py`,
        'atlassian/dcapt',
        'terminate_cluster.py', '--cluster_name', `atlas-${environment}-cluster`, '--aws_region', 'us-east-2'
      ],
      { cwd: join(cwd, 'app/util/k8s'), stdio: 'inherit' }
    );
    docker.on('exit', (code) => (code === 0) ? resolve() : reject(new Error(`Docker exited with code ${code}`)));
  });

  console.log(`✔ Finished terminating the DC cluster on AWS using the Atlassian Data Center App Performace Toolkit (DCAPT) Terraform configuration`);
}