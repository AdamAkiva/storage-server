import {
  ERR_CODES,
  createServer,
  express,
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  resolve,
  type AddressInfo,
  type Express,
  type Logger,
  type Mode,
  type NextFunction,
  type Request,
  type ResponseWithoutCtx,
  type Server,
} from '../utils/index.js';

import * as Middlewares from './middleware.js';

/**********************************************************************************/

export default class HttpServer {
  // Allowed in ESM since v20.11.0: https://github.com/nodejs/node/pull/48740
  static readonly #OPENAPI_FILE = resolve(
    import.meta.dirname,
    '../api-docs/openapi.html'
  );

  readonly #mode;

  readonly #server;
  readonly #routes;

  readonly #requestContext;

  readonly #logger;

  /********************************************************************************/

  public static async create(params: {
    mode: Mode;
    allowedMethods: Set<string>;
    allowedHosts: Set<string>;
    routes: { http: string; health: string };
    logger: ReturnType<Logger['getHandler']>;
    logMiddleware: (
      req: Request,
      res: ResponseWithoutCtx,
      next: NextFunction
    ) => void;
  }) {
    const {
      mode,
      allowedMethods,
      allowedHosts,
      routes,
      logger,
      logMiddleware,
    } = params;

    // Disable 'x-powered-by' should be pretty clear. The Reason for disabling etag
    // can be understood by this comprehensive answer: https://stackoverflow.com/a/67929691
    const app = express().disable('etag').disable('x-powered-by');
    const server = createServer(app);

    const self = new HttpServer({
      mode: mode,
      server: server,
      routes: routes,
      logger: logger,
    });

    // The order matters, don't change without understanding what you're doing
    // first
    await self.#attachConfigurationMiddlewares(app, allowedMethods);
    self.#attachRoutesMiddlewares({
      app: app,
      allowedHosts: allowedHosts,
      logMiddleware: logMiddleware,
      routes: { healthRoute: routes.health, httpRoute: routes.http },
    });

    return self;
  }

  public async listen(port?: number | string) {
    if (port) {
      port = typeof port === 'string' ? Number(port) : port;
    }

    return await new Promise<number>((resolve) => {
      this.#server.once('listening', () => {
        // Can be asserted since this is not a unix socket and we are inside
        // the listen event, see: https://nodejs.org/api/net.html#serveraddress
        const { address, port } = this.#server.address() as AddressInfo;

        if (!isTestMode(this.#mode)) {
          const route = this.#routes.http;

          this.#logger.info(
            `Server is running in '${this.#mode}' mode on: ` +
              `'${address.endsWith(':') ? address : address.concat(':')}${port}${route}'`
          );
        }

        resolve(port);
      });

      this.#server.listen(port);
    });
  }

  public close() {
    this.#server.close();
  }

  /********************************************************************************/

  // Prevent creating the class via the constructor because it needs to be an
  // async creation
  private constructor(params: {
    mode: Mode;
    server: Server;
    routes: { http: string; health: string };
    logger: ReturnType<Logger['getHandler']>;
  }) {
    const { mode, server, routes, logger } = params;

    this.#mode = mode;
    this.#server = server;
    this.#routes = routes;
    this.#logger = logger;

    this.#requestContext = {
      logger: logger,
    };

    this.#attachServerConfigurations();
    this.#attachServerEventHandlers();
  }

  #attachServerConfigurations() {
    // Every configuration referring to sockets here, talks about network/tcp
    // socket NOT websockets. Network socket is the underlying layer for http
    // request (in this case). In short, the socket options refer to a "standard"
    // connection from a client
    this.#server.maxHeadersCount = 50;
    this.#server.headersTimeout = 20_000; // millis
    this.#server.requestTimeout = 20_000; // millis
    // Connection close will terminate the tcp socket once the payload was
    // transferred and acknowledged. This setting is for the rare cases where,
    // for some reason, the tcp socket is left alive
    this.#server.timeout = 600_000; // millis
    // See: https://github.com/nodejs/node/issues/40071
    // Leaving this without any limit will cause the server to reuse the
    // connection indefinitely (in theory). As a result, load balancing will
    // have very little effects if more instances of the server are brought up
    // by the deployment orchestration tool.
    // As for a good number, it depends on the application traffic
    this.#server.maxRequestsPerSocket = 100;
    this.#server.keepAliveTimeout = 10_000; // millis
  }

  #attachServerEventHandlers() {
    // When a function is passed as a callback (even a method), the `this`
    // context is lost (if it's not an arrow function). There are a couple
    // of options to resolve said issue:
    // 1. Make `this._healthCheck` an arrow function
    // 2. Inline implementation as an anonymous arrow function
    // 3. Bind `this` context to the called function
    // We chose number 3 to be in line with the rest of the style of
    // the application
    this.#server
      .once('error', this.#handleErrorEvent.bind(this))
      .once('close', this.#handleCloseEvent.bind(this));
  }

  #handleErrorEvent(err: Error) {
    this.#logger.fatal(err, 'HTTP Server error');

    // If an event emitter error happened, we shutdown the application.
    // As a result we allow the deployment orchestration tool to attempt to
    // rerun the application in a "clean" state
    process.exit(ERR_CODES.EXIT_RESTART);
  }

  async #handleCloseEvent() {
    let exitCode = 0;
    const results = await Promise.allSettled([
      // Close all services here (database for example)
      Promise.resolve(0),
    ]);
    for (const result of results) {
      if (result.status === 'rejected') {
        this.#logger.fatal(result.reason, 'Error during server termination');
        exitCode = ERR_CODES.EXIT_RESTART;
      }
    }
    if (exitCode) {
      return process.exit(exitCode);
    }

    process.exitCode = 0;
  }

  async #attachConfigurationMiddlewares(
    app: Express,
    allowedMethods: Set<string>
  ) {
    app.use(
      Middlewares.checkMethod(allowedMethods)
      // Remove CORS if this only a backend application
    );
    if (isProductionMode(this.#mode)) {
      app.use(
        (await import('helmet')).default({
          contentSecurityPolicy: true /* require-corp */,
          crossOriginEmbedderPolicy: { policy: 'require-corp' },
          crossOriginOpenerPolicy: { policy: 'same-origin' },
          crossOriginResourcePolicy: { policy: 'same-origin' },
          originAgentCluster: true,
          referrerPolicy: { policy: 'no-referrer' },
          strictTransportSecurity: {
            maxAge: 15_552_000, // 180 days in seconds
            includeSubDomains: true,
          },
          xContentTypeOptions: true,
          xDnsPrefetchControl: false,
          xDownloadOptions: true,
          xFrameOptions: { action: 'deny' },
          xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
          xXssProtection: true,
          xPoweredBy: false,
        })
      );
    }
  }

  #attachRoutesMiddlewares(params: {
    app: Express;
    allowedHosts: Set<string>;
    logMiddleware: (
      req: Request,
      res: ResponseWithoutCtx,
      next: NextFunction
    ) => void;
    routes: { healthRoute: string; httpRoute: string };
  }) {
    const {
      app,
      allowedHosts,
      logMiddleware,
      routes: { healthRoute, httpRoute },
    } = params;

    if (isDevelopmentMode(this.#mode)) {
      this.#attachAPIDocs(app, httpRoute);
    }

    app
      .get(
        healthRoute,
        Middlewares.healthCheck(allowedHosts, this.#healthCheck.bind(this))
      )
      // The middlewares are executed in order (as set by express) and there's
      // no point to log every health check or every call to the api-docs
      // (development only), so the log middleware comes after the health
      // check route
      .use(logMiddleware)
      .use(httpRoute, Middlewares.attachContext(this.#requestContext))
      // Add the routers here

      // Non-existent route & error handler
      .use('*', Middlewares.handleMissedRoutes, Middlewares.errorHandler);
  }

  #attachAPIDocs(app: Express, apiRoute: string) {
    app.use(`${apiRoute}/api-docs`, (_, res) => {
      res.sendFile(HttpServer.#OPENAPI_FILE);
    });
  }

  async #healthCheck() {
    // Add the health check here, for example:
    // let notReadyMsg = '';
    // try {
    //   await this.#db.isReady();
    // } catch (err) {
    //   this.#logger.error(err, 'Database error');
    //   notReadyMsg += '\nDatabase is unavailable';
    // }

    return await Promise.resolve('');
  }
}
