import {
  asyncDebugWrapper,
  fileDebug,
  StatusCodes,
  type NextFunction,
  type Request,
  type ResponseWithCtx,
} from '../../utils/index.js';

import * as Service from './service/index.js';

/**********************************************************************************/

export async function uploadLocalFile(
  req: Request,
  res: ResponseWithCtx,
  next: NextFunction
) {
  try {
    await asyncDebugWrapper(
      async () => {
        await Service.upload({
          req: req,
          ctx: res.locals.ctx,
          eventHandler: Service.uploadLocalFileEventHandler,
        });
      },
      { instance: fileDebug, msg: 'Uploading file' }
    );

    res.status(StatusCodes.SUCCESS).json('OK');
  } catch (err) {
    return next(err);
  }
}

export async function uploadLocalSecureFile(
  req: Request,
  res: ResponseWithCtx,
  next: NextFunction
) {
  try {
    await asyncDebugWrapper(
      async () => {
        await Service.upload({
          req: req,
          ctx: res.locals.ctx,
          eventHandler: Service.uploadLocalSecureFileEventHandler,
        });
      },
      { instance: fileDebug, msg: 'Uploading file' }
    );

    res.status(StatusCodes.SUCCESS).json('OK');
  } catch (err) {
    return next(err);
  }
}
