import { Command } from 'commander';
import { asyncExitHook, gracefulExit } from 'exit-hook';
import { z } from 'zod';

import { TBuildOptions } from '../types/AMPS';
import { TApplicationOptions } from '../types/Application';
import { TDatabaseOptions } from '../types/Database';

export const ActionHandler = async <T extends TApplicationOptions|TDatabaseOptions|TBuildOptions> (program: Command, { action, errorHandler }: {
  action: (options: T) => Promise<void>;
  errorHandler: (options: T) => Promise<void>;
}, options?: T) => {
  const ops: T = options || program.opts();
  await new Promise<void>((resolve, reject) => {
    let errorMessage: string|null = '';

    asyncExitHook(async (code) => {
      try {
        if (code !== 0) {
          await errorHandler(ops).catch(() => null);
        }

        if (errorMessage) {
          throw new Error(errorMessage.trim());
        } else {
          resolve();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : err;
        reject(message);
      }
    }, {
      wait: 30 * 1000
    });

    action(ops).catch(err => {
      if (err instanceof z.ZodError) {
        err.issues.forEach(issue => {
          errorMessage += `Unable to parse option ${issue.path.join(',')}: ${issue.message}\n`
        });
      } else if (err instanceof Error || typeof err === 'string') {
        errorMessage = err.toString();
      }
      gracefulExit(1);
    });
  }).catch(message => program.error(message));
}