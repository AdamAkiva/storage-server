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
import express, { Router, json } from 'express';
import helmet from 'helmet';

import EnvironmentVariables from './config.js';
import {
  ERR_CODES,
  StatusCodes,
  VALIDATION,
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
  BusBoy,
  ERR_CODES,
  EnvironmentVariables,
  ILRDStorageError,
  Logger,
  Router,
  StatusCodes,
  Transform,
  VALIDATION,
  asyncDebugWrapper,
  createCipheriv,
  createDecipheriv,
  createHash,
  createServer,
  createWriteStream,
  debugWrapper,
  express,
  fileDebug,
  filterNullAndUndefined,
  generalDebug,
  helmet,
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  json,
  objHasValues,
  pipeline,
  randomUUID,
  resolve,
  strcasecmp,
  type AddOptional,
  type AddRequired,
  type AddressInfo,
  type ArrayWithAtLeastOneValue,
  type BusboyEvents,
  type DebugInstance,
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
