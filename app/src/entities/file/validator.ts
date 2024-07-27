import { VALIDATION, Zod, type Request } from '../../utils/index.js';

import {
  checkAndParseValidationErrors,
  emptyObjectErrMap,
  emptyObjectSchema,
  invalidBooleanErr,
  invalidObjectErr,
  requiredErr,
  type ValidatedType,
} from '../utils.js';

/**********************************************************************************/

const { ALLOWED_STORAGE_MEDIUMS } = VALIDATION;

/**********************************************************************************/

export function uploadFile(req: Request) {
  const { body, params, query } = req;

  const bodyRes = uploadFileSchema.safeParse(body);
  const emptyObjectRes = emptyObjectSchema.safeParse(
    { ...params, ...query },
    {
      errorMap: emptyObjectErrMap(
        'Expected empty path params and query params'
      ),
    }
  );
  const err = checkAndParseValidationErrors(bodyRes, emptyObjectRes);
  if (err) {
    throw err;
  }

  return (bodyRes as ValidatedType<typeof uploadFileSchema>).data;
}

/**********************************************************************************/

const uploadFileSchema = Zod.object(
  {
    encrypt: Zod.boolean({
      invalid_type_error: invalidBooleanErr('encrypt'),
    }).default(false),
    storage: Zod.enum(ALLOWED_STORAGE_MEDIUMS).default('local'),
  },
  {
    invalid_type_error: invalidObjectErr('file'),
    required_error: requiredErr('file'),
  }
).strict();
