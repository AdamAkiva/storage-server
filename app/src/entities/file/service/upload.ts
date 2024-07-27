import {
  BusBoy,
  createWriteStream,
  ILRDStorageError,
  mime,
  pipeline,
  randomUUID,
  StatusCodes,
  Transform,
  VALIDATION,
  type BusboyEvents,
  type Reject,
  type Request,
  type RequestContext,
  type Resolve,
} from '../../../utils/index.js';

/**********************************************************************************/

type EventHandler = (params: {
  ctx: RequestContext;
  resolve: Resolve;
  reject: Reject;
}) => BusboyEvents['file'];

/**********************************************************************************/

export async function upload(params: {
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

/**********************************************************************************/

export function uploadLocalFileEventHandler(params: {
  ctx: RequestContext;
  resolve: Resolve;
  reject: Reject;
}): BusboyEvents['file'] {
  const {
    ctx: { localFilesPath, db },
    resolve,
    reject,
  } = params;
  const handler = db.getHandler();
  const {
    file: { model: fileModel },
  } = db.getModels();

  return async (_, file, info) => {
    try {
      const { filename, encoding, mimeType } = info;
      const id = randomUUID();
      const extension = mime.extension(mimeType);
      let fileSize = 0;
      const filePath = `${localFilesPath}/${id}.${extension}`;

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

      const results = await Promise.allSettled([
        pipeline(file, trackingStream, createWriteStream(filePath)),
        handler.insert(fileModel).values({
          name: filename,
          encoding: encoding,
          mimeType: mimeType,
          path: filePath,
          secured: false,
        }),
      ]);
      results.forEach((result) => {
        {
          if (result.status === 'rejected') {
            throw result.reason;
          }
        }
      });

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

export function uploadLocalSecureFileEventHandler(params: {
  ctx: RequestContext;
  resolve: Resolve;
  reject: Reject;
}): BusboyEvents['file'] {
  const {
    ctx: { localFilesPath, encryption, db },
    resolve,
    reject,
  } = params;
  const handler = db.getHandler();
  const {
    file: { model: fileModel },
  } = db.getModels();

  return async (_, file, info) => {
    try {
      const { filename, encoding, mimeType } = info;
      const id = randomUUID();
      const extension = mime.extension(mimeType);
      let fileSize = 0;
      const cipher = encryption.getEncryptionPipe();
      const filePath = `${localFilesPath}/${id}.${extension}`;

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

      const results = await Promise.allSettled([
        pipeline(file, trackingStream, createWriteStream(filePath)),
        handler.insert(fileModel).values({
          name: filename,
          encoding: encoding,
          mimeType: mimeType,
          path: filePath,
          secured: true,
        }),
      ]);
      results.forEach((result) => {
        {
          if (result.status === 'rejected') {
            throw result.reason;
          }
        }
      });

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
