import {
  ILRDStorageError,
  StatusCodes,
  VALIDATION,
  Zod,
  type Request,
} from '../../utils/index.js';

import {
  checkAndParseValidationErrors,
  emptyObjectErrMap,
  emptyObjectSchema,
  invalidObjectErr,
  invalidStringErr,
  invalidUuidErr,
  requiredErr,
  type ValidatedType,
} from '../utils.js';

/**********************************************************************************/

const { ALLOWED_STORAGE_MEDIUMS, ENCRYPTION_OPTIONS, MAX_FILE_SIZE } =
  VALIDATION;

/**********************************************************************************/

export function readFile(req: Request) {
  const { body, params, query } = req;

  const paramsRes = readFileSchema.safeParse(params);
  const emptyObjectRes = emptyObjectSchema.safeParse(
    { ...body, ...query },
    {
      errorMap: emptyObjectErrMap('Expected empty body and query params'),
    }
  );
  const err = checkAndParseValidationErrors(paramsRes, emptyObjectRes);
  if (err) {
    throw err;
  }

  return (paramsRes as ValidatedType<typeof readFileSchema>).data;
}

export function uploadFile(req: Request) {
  const { body, params, query } = req;

  if (!req.headers['content-length']) {
    throw new ILRDStorageError(
      'Missing content length header',
      StatusCodes.BAD_REQUEST
    );
  }

  // We know content length is not an accurate estimation of the actual file size
  // but it is good enough for us
  if (Number(req.headers['content-length']) > MAX_FILE_SIZE) {
    throw new ILRDStorageError(
      'File size is too large',
      StatusCodes.BAD_REQUEST
    );
  }

  const paramsRes = uploadFileSchema.safeParse(params);
  const emptyObjectRes = emptyObjectSchema.safeParse(
    { ...body, ...query },
    {
      errorMap: emptyObjectErrMap('Expected empty body and query params'),
    }
  );
  const err = checkAndParseValidationErrors(paramsRes, emptyObjectRes);
  if (err) {
    throw err;
  }

  return (paramsRes as ValidatedType<typeof uploadFileSchema>).data;
}

/**********************************************************************************/

const readFileSchema = Zod.object(
  {
    id: Zod.string({
      invalid_type_error: invalidStringErr('id'),
      required_error: requiredErr('id'),
    }).uuid(invalidUuidErr('id')),
    storageMedium: Zod.enum(ALLOWED_STORAGE_MEDIUMS, {
      invalid_type_error: invalidStringErr('storage medium'),
    }),
    encryption: Zod.enum(ENCRYPTION_OPTIONS, {
      invalid_type_error: invalidStringErr('encryption'),
    }),
  },
  {
    invalid_type_error: invalidObjectErr('file'),
    required_error: requiredErr('file'),
  }
).strict();

const uploadFileSchema = Zod.object(
  {
    storageMedium: Zod.enum(ALLOWED_STORAGE_MEDIUMS, {
      invalid_type_error: invalidStringErr('storage medium'),
    }).default('disk'),
    encryption: Zod.enum(ENCRYPTION_OPTIONS, {
      invalid_type_error: invalidStringErr('encryption'),
    }).default('plain'),
  },
  {
    invalid_type_error: invalidObjectErr('file'),
    required_error: requiredErr('file'),
  }
).strict();
