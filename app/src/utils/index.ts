import { createServer } from 'node:http';
import { resolve } from 'node:path';

import express, { Router, json } from 'express';
import helmet from 'helmet';

import EnvironmentVariables from './config.js';
import {
  ERR_CODES,
  StatusCodes,
  VALIDATION,
  generalDebug,
} from './constants.js';
import NodeTemplateError from './error.js';
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
  DebugInstance,
  Express,
  MaybeArray,
  Mode,
  NextFunction,
  Request,
  RequestContext,
  ResolvedValue,
  ResponseWithCtx,
  ResponseWithoutCtx,
  Server,
  UnknownObject,
} from './types/index.js';

/**********************************************************************************/

export {
  ERR_CODES,
  EnvironmentVariables,
  Logger,
  NodeTemplateError,
  Router,
  StatusCodes,
  VALIDATION,
  asyncDebugWrapper,
  createServer,
  debugWrapper,
  express,
  filterNullAndUndefined,
  generalDebug,
  helmet,
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  json,
  objHasValues,
  resolve,
  strcasecmp,
  type AddOptional,
  type AddRequired,
  type AddressInfo,
  type ArrayWithAtLeastOneValue,
  type DebugInstance,
  type Express,
  type MaybeArray,
  type Mode,
  type NextFunction,
  type Request,
  type RequestContext,
  type ResolvedValue,
  type ResponseWithCtx,
  type ResponseWithoutCtx,
  type Server,
  type UnknownObject,
};
