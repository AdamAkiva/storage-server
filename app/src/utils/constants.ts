import Debug from 'debug';

/**********************************************************************************/

export const generalDebug = Debug('node-template:general');

/**********************************************************************************/

export const VALIDATION = {
  // Populate this with validation limits, such as length/regex limits
} as const;

/**********************************************************************************/

export enum StatusCodes {
  SUCCESS = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  MOVED_PERMANENTLY = 301,
  REDIRECT = 304,
  TEMPORARY_REDIRECT = 307,
  PERMANENT_REDIRECT = 308,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  NOT_ALLOWED = 405,
  REQUEST_TIMEOUT = 408,
  CONFLICT = 409,
  CONTENT_TOO_LARGE = 413,
  TOO_MANY_REQUESTS = 429,
  SERVER_ERROR = 500,
  GATEWAY_TIMEOUT = 504
}

export const ERR_CODES = {
  // Indicator to the deployment orchestration service to not attempt to restart
  // the service, since the error is a result of a programmer error, and therefore
  // the application should not restart by default
  EXIT_RESTART: 1,
  EXIT_NO_RESTART: 180
} as const;
