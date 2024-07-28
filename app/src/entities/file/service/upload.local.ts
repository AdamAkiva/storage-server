import { encryptStream } from '../../utils.js';

import {
  BusBoy,
  createWriteStream,
  mime,
  pipeline,
  randomUUID,
  VALIDATION,
  type BusboyEvents,
  type EventHandler,
  type Reject,
  type Request,
  type RequestContext,
  type Resolve,
} from '../../../utils/index.js';

/**********************************************************************************/

export async function uploadLocal(params: {
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
      const filePath = `${localFilesPath}/${randomUUID()}.${mime.extension(mimeType)}`;

      const results = await Promise.allSettled([
        pipeline(file, createWriteStream(filePath)),
        handler.insert(fileModel).values({
          name: filename,
          encoding: encoding,
          mimeType: mimeType,
          storageMedium: 'local',
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

      file.on('error', (err) => {
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
      const filePath = `${localFilesPath}/${randomUUID()}.${mime.extension(mimeType)}`;
      const cipher = encryption.createEncryptionCipher();

      const results = await Promise.allSettled([
        pipeline(file, encryptStream(cipher), createWriteStream(filePath)),
        handler.insert(fileModel).values({
          name: filename,
          encoding: encoding,
          mimeType: mimeType,
          storageMedium: 'local',
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

      file.on('error', (err) => {
        return reject(err);
      });

      return resolve();
    } catch (err) {
      return reject(err);
    }
  };
}
