import type { DebugInstance, DrizzleLogger } from '../utils/index.js';

/**********************************************************************************/

export default class DatabaseLogger implements DrizzleLogger {
  readonly #healthCheckQuery;
  readonly #debug;

  public constructor(healthCheckQuery: string, debug: DebugInstance) {
    this.#healthCheckQuery = healthCheckQuery;
    this.#debug = debug;
  }

  public logQuery(query: string, params: unknown[]) {
    if (this.#healthCheckQuery !== query) {
      this.#debug(`Database query:\n%o\nParams: %o`, query, params);
    }
  }
}
