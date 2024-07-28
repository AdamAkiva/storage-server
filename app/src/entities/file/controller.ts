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
  disk: {
    plain: 'uploadFileToDiskEventHandler',
    encrypt: 'uploadSecureFileToDiskEventHandler',
  },
  s3: {
    plain: 'uploadFileToS3EventHandler',
    encrypt: 'uploadSecureFileToS3EventHandler',
  },
} as const;

/**********************************************************************************/

export async function readFile(
  req: Request,
  res: ResponseWithCtx,
  next: NextFunction
) {
  try {
    const params = debugWrapper(
      () => {
        return Validator.readFile(req);
      },
      { instance: fileDebug, msg: `${readFile.name} validation` }
    );

    await asyncDebugWrapper(
      async () => {
        switch (params.storageMedium) {
          case 'disk':
            return await Service.readFileFromDisk(params.id, res);
          case 's3':
            return await Service.readFileFromS3(params.id, res);
          default:
            throw new ILRDStorageError(
              'Unsupported storage medium',
              StatusCodes.BAD_REQUEST
            );
        }
      },
      { instance: fileDebug, msg: `${readFile.name} service` }
    );
    // Res is being stream to at service level
  } catch (err) {
    return next(err);
  }
}

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

    const id = await asyncDebugWrapper(
      async () => {
        const eventHandler =
          Service[uploadFileMap[params['storageMedium']][params.encryption]];

        switch (params.storageMedium) {
          case 'disk':
            return await Service.uploadToDisk({
              req: req,
              ctx: res.locals.ctx,
              eventHandler: eventHandler,
            });
          case 's3':
            return await Service.uploadToS3({
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

    res.status(StatusCodes.SUCCESS).json(id);
  } catch (err) {
    return next(err);
  }
}
