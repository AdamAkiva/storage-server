import {
  ERR_CODES,
  ILRDStorageError,
  pg,
  StatusCodes,
  unlink,
  VALIDATION,
  Zod,
  type Reject,
} from '../utils/index.js';

/***************************** Validation related *********************************/
/**********************************************************************************/

export type ValidatedType<T extends Zod.ZodType> = Zod.SafeParseSuccess<
  Zod.infer<T>
>;

export const emptyObjectSchema = Zod.object({}).strict();

const { MAX_FILE_SIZE, DELETE_FILE_DELAY } = VALIDATION;

/**********************************************************************************/

export function emptyObjectErrMap(errMsg: string) {
  return ((issue, ctx) => {
    if (issue.code === Zod.ZodIssueCode.unrecognized_keys) {
      return { message: errMsg };
    }

    return { message: ctx.defaultError };
  }) satisfies Zod.ZodErrorMap;
}

export function checkAndParseValidationErrors(
  ...results: Zod.SafeParseReturnType<unknown, unknown>[]
) {
  const errs = results
    .filter((result): result is Zod.SafeParseError<unknown> => {
      return !result.success;
    })
    .map((result) => {
      return result.error;
    });
  if (!errs.length) {
    return undefined;
  }

  return parseErrors(errs);
}

function parseErrors(errs: Zod.ZodError<unknown>[]) {
  const delimiter = ', ';

  const errMsg = errs
    .map((err) => {
      return parseErrorMessages(err.issues, delimiter);
    })
    .join('')
    // This removes the last delimiter (if the string ended with one)
    .replace(/, $/, '');

  return new ILRDStorageError(errMsg, StatusCodes.BAD_REQUEST);
}

function parseErrorMessages(issues: Zod.ZodIssue[], delimiter: string): string {
  return issues
    .map((issue) => {
      switch (issue.code) {
        case 'unrecognized_keys':
          if (issue.keys.length > 1) {
            return `Extra keys: '${issue.keys.join(', ')}' are not allowed`;
          }

          return `Extra key: '${issue.keys[0]}' is not allowed`;
        default:
          return issue.message;
      }
    })
    .join(delimiter)
    .concat(delimiter);
}

export function invalidObjectErr(fieldName: string) {
  return `'${fieldName}' is not a valid object`;
}

export function invalidStringErr(fieldName: string) {
  return `'${fieldName}' is not a valid string`;
}

export function invalidBooleanErr(fieldName: string) {
  return `'${fieldName}' is not a valid boolean`;
}

export function invalidUuidErr(fieldName: string) {
  return `'${fieldName}' is not a valid uuid`;
}

export function requiredErr(fieldName: string) {
  return `'${fieldName}' is required`;
}

/***************************** Service related ************************************/
/**********************************************************************************/

type Entity = 'file';

/**********************************************************************************/

export function entityNotFoundError(
  entity: Entity,
  id?: string,
  err?: unknown
) {
  const entityName = entity.charAt(0).toUpperCase() + entity.slice(1);

  if (
    err instanceof pg.PostgresError &&
    err.code === ERR_CODES.PG.FOREIGN_KEY_VIOLATION
  ) {
    return new ILRDStorageError(
      // TODO Check that parameters[0] is valid
      `${entityName} '${id ?? err.parameters[0]}' does not exist`,
      StatusCodes.NOT_FOUND
    );
  } else if (err instanceof Error) {
    return err;
  }

  return new ILRDStorageError(
    `${entityName} '${id}' does not exist`,
    StatusCodes.NOT_FOUND
  );
}

export function storageMediumMismatchError() {
  return new ILRDStorageError(
    'File storage medium mismatch',
    StatusCodes.BAD_REQUEST
  );
}

export function fileSizeTooLargeError() {
  return new ILRDStorageError(
    'File size is too large',
    StatusCodes.BAD_REQUEST
  );
}

export function streamFileError(err: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  err; // TODO
  return new ILRDStorageError('Error streaming file', StatusCodes.SERVER_ERROR);
}

export function checkFileSize(params: {
  fileSize: number;
  filePath?: string;
  reject: Reject;
}) {
  const { fileSize, filePath, reject } = params;

  if (fileSize < MAX_FILE_SIZE) {
    return;
  }

  if (filePath) {
    setTimeout(() => {
      unlink(filePath).catch(() => {
        // On purpose
      });
    }, DELETE_FILE_DELAY);
  }

  reject(fileSizeTooLargeError());
}
