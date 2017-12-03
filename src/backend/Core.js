import { spawn } from 'child_process';

import chalk from 'chalk';
import snakeCase from 'lodash.snakecase';

const xiCoreBin = process.env.XI_CORE_BIN;

const formatLog = string => {
  return string.trim().replace(/\n/g, '\n  ');
};

export default class Core {
  static METHODS = {
    NEW_VIEW: 'new_view',
  };

  child = null;

  lastId = -1;
  waitingIds = [];

  constructor() {
    console.log(`[Core] Starting xi-core: ${chalk.dim(xiCoreBin)}`);

    this.child = spawn(xiCoreBin);

    this.child.stdout.on('data', this.handleData.bind(this));
    this.child.stderr.on('data', this.handleError.bind(this));
  }

  async send(method, params = {}) {
    if (Object.values(Core.METHODS).indexOf(method) === -1) {
      console.error(`[Core] Unrecognized method: ${method}`);

      return false;
    }

    this.lastId++;

    const data = {
      id: this.lastId,
      method,
      params: Object.entries(params)
        .map(([key, value]) => [snakeCase(key), value])
        .reduce((prev, [key, value]) => ({ ...prev, [key]: value }), {}),
    };

    try {
      const message = `${JSON.stringify(data)}\n`;

      console.log(chalk.green(formatLog(`[Core] -> xi-core:\n${message}`)));

      this.child.stdin.write(message);
    } catch (err) {
      console.error(chalk.red('[Core] Send error:'));
      console.error(err);

      return false;
    }

    this.waitingIds.push(this.lastId);

    return true;
  }

  async quit() {
    console.log('[Core] Killing xi-core...');

    this.child.kill();

    await new Promise(resolve => {
      this.child.on('exit', () => {
        console.log('[Core] xi-core killed');
        resolve();
      });
    });
  }

  handleData(buffer) {
    console.log(chalk.blue(formatLog(`[Core] <- xi-core:\n${buffer}`)));

    buffer
      .toString()
      .trim()
      .split('\n')
      .map(JSON.parse)
      .forEach(data => {
        if (data.result) {
          if (data.id === undefined) {
            console.warn(chalk.yellow('[Core] Recieved result with no id'));
          } else {
            const waitingIndex = this.waitingIds.indexOf(data.id);

            if (waitingIndex === -1) {
              console.error(
                chalk.red('[Core] Recieved result with unexpected id'),
              );

              // TODO: How do we properly resolve this? We probably have
              //       mismatched state with xi-core now.
              return;
            }

            this.waitingIds.splice(waitingIndex, 1);
          }
        }
      });

    if (this.waitingIds.length) {
      console.log(
        `[Core] Still waiting for ids: [ ${this.waitingIds.join(', ')} ]`,
      );
    }
  }

  handleError(buffer) {
    console.error(chalk.red(formatLog(`[Core] xi-core error: ${buffer}`)));
  }
}
