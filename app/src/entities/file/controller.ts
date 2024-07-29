import {
  asyncDebugWrapper,
  debugWrapper,
  fileDebug,
  StatusCodes,
  type NextFunction,
  type Request,
  type ResponseWithCtx,
} from '../../utils/index.js';

import * as Service from './service/index.js';
import * as Validator from './validator.js';

/**********************************************************************************/

const readFileMap = {
  disk: 'readFileFromDiskHandler',
  s3: 'readFileFromS3Handler',
} as const;

const uploadFileMap = {
  disk: 'uploadFileToDiskHandler',
  s3: 'uploadFileToS3EventHandler',
} as const;

/**********************************************************************************/

export async function readFile(
  req: Request,
  res: ResponseWithCtx,
  next: NextFunction
) {
  try {
    const { id, storageMedium } = debugWrapper(
      () => {
        return Validator.readFile(req);
      },
      { instance: fileDebug, msg: `${readFile.name} validation` }
    );

    await asyncDebugWrapper(
      async () => {
        return await Service.readFile({
          id: id,
          storageMedium: storageMedium,
          res: res,
          eventHandler: Service[readFileMap[storageMedium]],
        });
      },
      { instance: fileDebug, msg: `${readFile.name} service` }
    );
    // Res is being stream to at service level, that's why there's nothing here
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
    const { storageMedium, encryption } = debugWrapper(
      () => {
        return Validator.uploadFile(req);
      },
      { instance: fileDebug, msg: `${uploadFile.name} validation` }
    );

    const id = await asyncDebugWrapper(
      async () => {
        return await Service.uploadFile({
          req: req,
          ctx: res.locals.ctx,
          encrypt: encryption,
          eventHandler: Service[uploadFileMap[storageMedium]],
        });
      },
      { instance: fileDebug, msg: `${uploadFile.name} service` }
    );

    res.status(StatusCodes.SUCCESS).json(id);
  } catch (err) {
    return next(err);
  }
}
