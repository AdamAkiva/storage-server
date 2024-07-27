import { ERR_CODES } from './constants.js';
import {
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
} from './functions.js';
import type { Mode } from './types/index.js';

/**********************************************************************************/

type EnvironmentVariables = {
  mode: Mode;
  server: {
    port: string;
    baseUrl: string;
    httpRoute: string;
    healthCheck: { route: string; allowedHosts: Set<string> };
  };
  localFilesPath: string;
  db: string;
  encryption: {
    key: string;
    iv: string;
  };
};

/**********************************************************************************/

export default class EnvironmentManager {
  readonly #environmentVariables;

  public constructor() {
    const mode = this.#checkRuntimeEnv(process.env.NODE_ENV);
    this.#checkForMissingEnvVariables(mode);

    this.#environmentVariables = {
      mode: mode,
      server: {
        port: process.env.SERVER_PORT!,
        baseUrl: process.env.SERVER_BASE_URL!,
        httpRoute: process.env.HTTP_ROUTE!,
        healthCheck: {
          route: process.env.HEALTH_CHECK_ROUTE!,
          allowedHosts: new Set(process.env.ALLOWED_HOSTS!.split(',')),
        },
      },
      localFilesPath: process.env.FILES_PATH!,
      db: process.env.DB_URL!,
      encryption: {
        key: process.env.ENCRYPTION_KEY_SEED!,
        iv: process.env.ENCRYPTION_IV_SEED!,
      },
    } as const satisfies EnvironmentVariables;
  }

  public getEnvVariables() {
    return this.#environmentVariables;
  }

  /********************************************************************************/

  #checkRuntimeEnv(mode?: string) {
    if (isDevelopmentMode(mode) || isTestMode(mode) || isProductionMode(mode)) {
      return mode as Mode;
    }

    console.error(
      `Missing or invalid 'NODE_ENV' env value, should never happen.` +
        ' Unresolvable, exiting...'
    );

    process.exit(ERR_CODES.EXIT_NO_RESTART);
  }

  #checkForMissingEnvVariables(mode: Mode) {
    let missingValues = '';
    this.#mapEnvironmentVariables(mode).forEach((val) => {
      if (!process.env[val]) {
        missingValues += `* Missing ${val} environment variable\n`;
      }
    });
    if (missingValues) {
      console.error(`\nMissing the following env vars:\n${missingValues}`);

      process.exit(ERR_CODES.EXIT_NO_RESTART);
    }
  }

  #mapEnvironmentVariables(mode: Mode) {
    const environmentVariables = [
      'SERVER_PORT',
      'SERVER_BASE_URL',
      'HTTP_ROUTE',
      'HEALTH_CHECK_ROUTE',
      'ALLOWED_HOSTS',
      'DB_URL',
      'FILES_PATH',
      'ENCRYPTION_KEY_SEED',
      'ENCRYPTION_IV_SEED',
    ];
    if (mode === 'development') {
      environmentVariables.push('SERVER_DEBUG_PORT');
    }

    return environmentVariables;
  }
}
