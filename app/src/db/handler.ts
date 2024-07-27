import {
  drizzle,
  getTableColumns,
  pg,
  sql,
  type DebugInstance,
} from '../utils/index.js';

import DatabaseLogger from './logger.js';
/* The default import is on purpose. See: https://orm.drizzle.team/docs/sql-schema-declaration */
import * as schema from './schemas.js';

/**********************************************************************************/

export default class Database {
  readonly #conn;
  readonly #handler;
  readonly #models;

  readonly #healthCheckQuery;

  // In regards to using handler and transaction interchangeably, have a look at:
  // https://www.answeroverflow.com/m/1164318289674125392
  // In short, it does not matter, handler and transaction are same except
  // for a rollback method, which is called automatically if a throw occurs

  public constructor(params: {
    url: string;
    options?: pg.Options<{}>;
    healthCheckQuery: string;
    debugInstance: DebugInstance;
  }) {
    const { url, options, healthCheckQuery, debugInstance: debug } = params;

    this.#healthCheckQuery = healthCheckQuery;

    // Note about transactions, postgres.js and drizzle:
    // Postgres.js create prepared statements per connection which lasts 60 minutes
    // (according to the settings we've supplied). Using drizzle with prepared
    // statements (which is a lie, see the description in `handler.js` file)
    // make an additional query before and after the transaction for something
    // we could not understand. However, since every transaction use a connection,
    // that means that the number of transactions which can occur concurrently
    // is at the very least the number of transaction * 2. We suggest also
    // allowing a couple of additional connections (just to be sure). In
    // addition to that, the max default number of concurrent postgres
    // connection is 100. When this number is reached postgres will throw
    // an exception. When the number of connections is not enough (at
    // least transaction * 2) the database will get stuck since no one
    // frees any connections and the server will get stuck as a result.
    // Currently we have no good way to resolve this
    this.#conn = pg(url, options ?? {});
    this.#handler = drizzle(this.#conn, {
      schema: schema,
      logger: new DatabaseLogger(this.#healthCheckQuery, debug),
    });

    this.#models = {
      file: {
        model: schema.fileModel,
        columns: getTableColumns(schema.fileModel),
      },
    };
  }

  public async close() {
    return await this.#conn.end({ timeout: 10 }); // in seconds
  }

  public async isReady() {
    await this.#handler.execute(sql.raw(this.#healthCheckQuery));
  }

  public getHandler() {
    return this.#handler;
  }

  public getModels() {
    return this.#models;
  }
}
