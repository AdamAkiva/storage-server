import Aws from '@aws-sdk/client-s3';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomUUID,
} from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import BusBoy from 'busboy';
import {
  type Logger as DrizzleLogger,
  getTableColumns,
  sql,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import express, { Router, json } from 'express';
import helmet from 'helmet';
import mime from 'mime-types';
import pg from 'postgres';
import Zod from 'zod';

import EnvironmentVariables from './config.js';
import {
  ERR_CODES,
  StatusCodes,
  VALIDATION,
  databaseDebug,
  fileDebug,
  generalDebug,
} from './constants.js';
import ILRDStorageError from './error.js';
import {
  asyncDebugWrapper,
  debugWrapper,
  filterNullAndUndefined,
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  objHasValues,
  strcasecmp,
} from './functions.js';
import Logger from './logger.js';
import type {
  AddOptional,
  AddRequired,
  AddressInfo,
  ArrayWithAtLeastOneValue,
  BusboyEvents,
  DebugInstance,
  Express,
  MaybeArray,
  Mode,
  NextFunction,
  Reject,
  Request,
  RequestContext,
  Resolve,
  ResolvedValue,
  ResponseWithCtx,
  ResponseWithoutCtx,
  Server,
  TransformCallback,
  UnknownObject,
} from './types/index.js';

/**********************************************************************************/

export {
  Aws,
  BusBoy,
  ERR_CODES,
  EnvironmentVariables,
  ILRDStorageError,
  Logger,
  Router,
  StatusCodes,
  Transform,
  VALIDATION,
  Zod,
  asyncDebugWrapper,
  createCipheriv,
  createDecipheriv,
  createHash,
  createServer,
  createWriteStream,
  databaseDebug,
  debugWrapper,
  drizzle,
  express,
  fileDebug,
  filterNullAndUndefined,
  generalDebug,
  getTableColumns,
  helmet,
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  json,
  mime,
  objHasValues,
  pg,
  pipeline,
  randomUUID,
  resolve,
  sql,
  strcasecmp,
  type AddOptional,
  type AddRequired,
  type AddressInfo,
  type ArrayWithAtLeastOneValue,
  type BusboyEvents,
  type DebugInstance,
  type DrizzleLogger,
  type Express,
  type MaybeArray,
  type Mode,
  type NextFunction,
  type Reject,
  type Request,
  type RequestContext,
  type Resolve,
  type ResolvedValue,
  type ResponseWithCtx,
  type ResponseWithoutCtx,
  type Server,
  type TransformCallback,
  type UnknownObject,
};
