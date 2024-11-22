
import { ChildProcess, execSync, SpawnSyncReturns } from 'child_process';
import { cwd } from 'process';

type CustomBuilderOptions = {
  cmd: string,
  cwd?: string;
}

export class CustomBuilder {

  private proc: ChildProcess|null = null;

  // ------------------------------------------------------------------------------------------ Constructor

  constructor(private options: CustomBuilderOptions) {}

  // ------------------------------------------------------------------------------------------ Public Methods

  public stop() {
    if (this.proc) {
      const killed = this.proc.kill(0);
      if (!killed) {
        throw new Error('Failed to terminate existing build process');
      }
    }
  }

  public async build() {
    return new Promise<void>((resolve, reject) => {
      if (this.proc) {
        const killed = this.proc.kill(0);
        if (!killed) {
          reject(new Error('Failed to terminate existing build process'));
        }
      }

      try {
        execSync(
          this.options.cmd,
          { cwd: this.options?.cwd || cwd(), stdio: 'inherit' }
        );
        resolve();
      } catch (err) {
        const { status } = err as SpawnSyncReturns<unknown>;
        reject(new Error(`Build exited with code ${status}`));
      }
    });
  }

}