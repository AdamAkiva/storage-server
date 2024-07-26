import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { TransformCallback } from 'node:stream';

import type { BusboyEvents } from 'busboy';
import type Debug from 'debug';
import type {
  Express,
  Response as ExpressResponse,
  NextFunction,
  Request,
  RequestHandler,
} from 'express';

import type Logger from '../logger.js';

import type { Encryption } from '../../server/index.js';

/******************************** General *****************************************/
/**********************************************************************************/

export type UnknownObject = { [key: string]: unknown };
export type MaybeArray<T = unknown> = T | T[];
export type ArrayWithAtLeastOneValue<T = unknown> = [T, ...T[]];

export type AddRequired<T, K extends keyof T> = Required<Pick<T, K>> & T;
export type AddOptional<T, K extends keyof T> = Omit<T, K> &
  Pick<Partial<T>, K>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResolvedValue<T = any> = T extends (...args: any) => any
  ? PromiseFulfilledResult<Awaited<ReturnType<T>>>
  : PromiseFulfilledResult<Awaited<T>>;

export type Resolve = (value: PromiseLike<void> | void) => void;
export type Reject = (reason?: unknown) => void;

export type Mode = 'development' | 'production' | 'test';

/**************************** Package related *************************************/
/**********************************************************************************/

export type ResponseWithoutCtx = ExpressResponse<unknown, {}>;
export type ResponseWithCtx = ExpressResponse<unknown, { ctx: RequestContext }>;

export type RequestContext = {
  encryption: Encryption;
  logger: ReturnType<Logger['getHandler']>;
};

export type DebugInstance = ReturnType<typeof Debug>;

/**********************************************************************************/

export {
  type AddressInfo,
  type BusboyEvents,
  type Express,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Server,
  type TransformCallback,
};
