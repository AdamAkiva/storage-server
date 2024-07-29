import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomUUID,
} from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { setTimeout } from 'node:timers/promises';

import BusBoy from 'busboy';
import {
  eq,
  getTableColumns,
  sql,
  type Logger as DrizzleLogger,
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
  type AllowedStorageMediums,
} from './constants.js';
import StorageServerError from './error.js';
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
  Cipher,
  DebugInstance,
  Decipher,
  Express,
  MaybeArray,
  Mode,
  NextFunction,
  NodeJsClient,
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
  WriteStream,
} from './types/index.js';

/**********************************************************************************/

export {
  BusBoy,
  ERR_CODES,
  EnvironmentVariables,
  GetObjectCommand, Logger,
  PutObjectCommand,
  Readable,
  Router,
  S3Client,
  StatusCodes, StorageServerError, Transform,
  VALIDATION,
  Zod,
  asyncDebugWrapper,
  createCipheriv,
  createDecipheriv,
  createHash,
  createReadStream,
  createServer,
  createWriteStream,
  databaseDebug,
  debugWrapper,
  drizzle,
  eq,
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
  setTimeout,
  sql,
  strcasecmp,
  unlink,
  type AddOptional,
  type AddRequired,
  type AddressInfo,
  type AllowedStorageMediums,
  type ArrayWithAtLeastOneValue,
  type BusboyEvents,
  type Cipher,
  type DebugInstance,
  type Decipher,
  type DrizzleLogger,
  type Express,
  type MaybeArray,
  type Mode,
  type NextFunction,
  type NodeJsClient,
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
  type WriteStream
};

