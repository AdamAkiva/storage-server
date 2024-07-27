import {
  asyncDebugWrapper,
  BusBoy,
  createWriteStream,
  fileDebug,
  ILRDStorageError,
  pipeline,
  StatusCodes,
  Transform,
  VALIDATION,
  type BusboyEvents,
  type NextFunction,
  type Reject,
  type Request,
  type RequestContext,
  type Resolve,
  type ResponseWithCtx,
} from '../../utils/index.js';

/**********************************************************************************/

type EventHandler = (params: {
  ctx: RequestContext;
  resolve: Resolve;
  reject: Reject;
}) => BusboyEvents['file'];

/**********************************************************************************/

export async function uploadFile(
  req: Request,
  res: ResponseWithCtx,
  next: NextFunction
) {
  try {
    await asyncDebugWrapper(
      async () => {
        await upload({
          req: req,
          ctx: res.locals.ctx,
          eventHandler: readFileEventHandler,
        });
      },
      { instance: fileDebug, msg: 'Uploading file' }
    );

    res.status(StatusCodes.SUCCESS).json('OK');
  } catch (err) {
    return next(err);
  }
}

export async function uploadSecureFile(
  req: Request,
  res: ResponseWithCtx,
  next: NextFunction
) {
  try {
    await asyncDebugWrapper(
      async () => {
        await upload({
          req: req,
          ctx: res.locals.ctx,
          eventHandler: readSecureFileEventHandler,
        });
      },
      { instance: fileDebug, msg: 'Uploading encrypted file' }
    );

    res.status(StatusCodes.SUCCESS).json('OK');
  } catch (err) {
    return next(err);
  }
}

/**********************************************************************************/

async function upload(params: {
  req: Request;
  ctx: RequestContext;
  eventHandler: EventHandler;
}) {
  const { req, ctx, eventHandler } = params;

  return await new Promise<void>((resolve, reject) => {
    req.pipe(
      BusBoy({
        headers: req.headers,
        highWaterMark: VALIDATION.BUFFER_SIZE,
      })
        .on('error', (error) => {
          reject(error);
        })
        .on(
          'file',
          eventHandler({ ctx: ctx, resolve: resolve, reject: reject })
        )
    );
  });
}

function readFileEventHandler(params: {
  ctx: RequestContext;
  resolve: Resolve;
  reject: Reject;
}): BusboyEvents['file'] {
  const { ctx, resolve, reject } = params;

  return async (_, file, info) => {
    try {
      const { filename, encoding, mimeType } = info; // Save to database
      let fileSize = 0;

      const trackingStream = new Transform({
        transform: (chunk, _, cb) => {
          fileSize += chunk.length;
          if (fileSize > VALIDATION.MAX_FILE_SIZE) {
            return cb(
              new ILRDStorageError(
                `File '${filename}' size is too large`,
                StatusCodes.BAD_REQUEST
              )
            );
          }

          return cb(null, chunk);
        },
      });

      await pipeline(file, trackingStream, createWriteStream(filename));

      file
        .on('end', () => {
          if (fileSize >= VALIDATION.MAX_FILE_SIZE) {
            return reject(
              new ILRDStorageError(
                `File '${filename}' size is too large`,
                StatusCodes.BAD_REQUEST
              )
            );
          }
        })
        .on('error', (err) => {
          return reject(err);
        });

      return resolve();
    } catch (err) {
      return reject(err);
    }
  };
}

function readSecureFileEventHandler(params: {
  ctx: RequestContext;
  resolve: Resolve;
  reject: Reject;
}): BusboyEvents['file'] {
  const {
    ctx: { encryption },
    resolve,
    reject,
  } = params;

  return async (_, file, info) => {
    try {
      const { filename, encoding, mimeType } = info; // Save to database
      let fileSize = 0;

      const cipher = encryption.getEncryptionPipe();

      const trackingStream = new Transform({
        transform: (chunk, _, cb) => {
          fileSize += chunk.length;
          if (fileSize > VALIDATION.MAX_FILE_SIZE) {
            return cb(
              new ILRDStorageError(
                `File '${filename}' size is too large`,
                StatusCodes.BAD_REQUEST
              )
            );
          }

          return cb(null, cipher.update(chunk));
        },
        flush: (cb) => {
          return cb(null, cipher.final());
        },
      });

      await pipeline(file, trackingStream, createWriteStream(filename));

      file
        .on('end', () => {
          if (fileSize >= VALIDATION.MAX_FILE_SIZE) {
            return reject(
              new ILRDStorageError(
                `File '${filename}' size is too large`,
                StatusCodes.BAD_REQUEST
              )
            );
          }
        })
        .on('error', (err) => {
          return reject(err);
        });

      return resolve();
    } catch (err) {
      return reject(err);
    }
  };
}
