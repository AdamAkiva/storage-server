import {
  asyncDebugWrapper,
  debugWrapper,
  fileDebug,
  ILRDStorageError,
  StatusCodes,
  type NextFunction,
  type Request,
  type ResponseWithCtx,
} from '../../utils/index.js';

import * as Service from './service/index.js';
import * as Validator from './validator.js';

/**********************************************************************************/

const uploadFileMap = {
  local: {
    plain: 'uploadLocalFileEventHandler',
    encrypt: 'uploadLocalSecureFileEventHandler',
  },
  s3: {
    plain: 'uploadS3FileEventHandler',
    encrypt: 'uploadS3SecureFileEventHandler',
  },
} as const;

/**********************************************************************************/

export async function uploadFile(
  req: Request,
  res: ResponseWithCtx,
  next: NextFunction
) {
  try {
    const params = debugWrapper(
      () => {
        return Validator.uploadFile(req);
      },
      { instance: fileDebug, msg: `${uploadFile.name} validation` }
    );

    await asyncDebugWrapper(
      async () => {
        const eventHandler =
          Service[uploadFileMap[params['storageMedium']][params.encryption]];

        switch (params.storageMedium) {
          case 'local':
            return await Service.uploadLocal({
              req: req,
              ctx: res.locals.ctx,
              eventHandler: eventHandler,
            });
          case 's3':
            return await Service.uploadS3({
              req: req,
              ctx: res.locals.ctx,
              eventHandler: eventHandler,
            });
          default:
            throw new ILRDStorageError(
              'Unsupported storage medium',
              StatusCodes.BAD_REQUEST
            );
        }
      },
      { instance: fileDebug, msg: `${uploadFile.name} service` }
    );

    res.status(StatusCodes.SUCCESS).json('OK');
  } catch (err) {
    return next(err);
  }
}
