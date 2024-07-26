/**
 * DON'T change the import to the local one, this needs to happen before everything.
 * This makes sure the first thing the code does is changing the captureRejections
 * option to true to account for all new instances of EventEmitter. If every
 * module only exports functions and has no global variables, then, in theory
 * you could do it in a later stage. With that said we don't want to trust the
 * initialization order, so we make sure it is the first thing that is being done
 * When the server runs
 */
import { EventEmitter } from 'node:events';
import { globalAgent } from 'node:http';

// See: https://nodejs.org/api/events.html#capture-rejections-of-promises
EventEmitter.captureRejections = true;

// The default stack trace limit is 10 calls. Increasing it to a number which
// we'll never have to think about it again
Error.stackTraceLimit = 256;

// To prevent DOS attacks, See: https://nodejs.org/en/learn/getting-started/security-best-practices#denial-of-service-of-http-server-cwe-400
globalAgent.maxSockets = 32;
globalAgent.maxTotalSockets = 1024;

/**********************************************************************************/

import { HttpServer } from './server/index.js';
import {
  ERR_CODES,
  EnvironmentVariables,
  Logger,
  generalDebug,
} from './utils/index.js';

/**********************************************************************************/

await startServer();

/**********************************************************************************/

async function startServer() {
  generalDebug('Application starting...');

  const {
    mode,
    server: serverEnv,
    encryption,
  } = new EnvironmentVariables().getEnvVariables();

  const { logger, logMiddleware } = createLogger();

  const server = await HttpServer.create({
    mode: mode,
    allowedMethods: new Set([
      'HEAD',
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ]),
    allowedHosts: serverEnv.healthCheck.allowedHosts,
    routes: {
      http: `/${serverEnv.httpRoute}`,
      health: `/${serverEnv.healthCheck.route}`,
    },
    encryptionParams: encryption,
    logger: logger,
    logMiddleware: logMiddleware,
  });

  await server.listen(serverEnv.port);

  attachProcessEventHandlers(server, logger);

  generalDebug('Application is ready');
}

/**********************************************************************************/

function createLogger() {
  const logger = new Logger();

  return {
    logger: logger.getHandler(),
    logMiddleware: logger.getLogMiddleware(),
  };
}

function attachProcessEventHandlers(
  server: HttpServer,
  logger: ReturnType<Logger['getHandler']>
) {
  process
    .on('warning', logger.warn)
    .once('SIGINT', signalHandler(server))
    .once('SIGQUIT', signalHandler(server))
    .once('SIGTERM', signalHandler(server))
    .once(
      'unhandledRejection',
      globalErrorHandler({
        server: server,
        reason: 'rejection',
        logger: logger,
      })
    )
    .once(
      'uncaughtException',
      globalErrorHandler({
        server: server,
        reason: 'exception',
        logger: logger,
      })
    );
}

function signalHandler(server: HttpServer) {
  return () => {
    server.close();
  };
}

function globalErrorHandler(params: {
  server: HttpServer;
  reason: 'exception' | 'rejection';
  logger: ReturnType<Logger['getHandler']>;
}) {
  const { server, reason, logger } = params;

  return (err: unknown) => {
    logger.fatal(err, `Unhandled ${reason}`);

    server.close();

    // See: https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html#error-exception-handling
    process.exit(ERR_CODES.EXIT_RESTART);
  };
}
