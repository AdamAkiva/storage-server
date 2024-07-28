import {
  BusBoy,
  mime,
  PutObjectCommand,
  randomUUID,
  Transform,
  VALIDATION,
  type BusboyEvents,
  type EventHandler,
  type Reject,
  type Request,
  type RequestContext,
  type Resolve,
} from '../../../utils/index.js';

/**********************************************************************************/

export async function uploadS3(params: {
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

export function uploadS3FileEventHandler(params: {
  ctx: RequestContext;
  resolve: Resolve;
  reject: Reject;
}): BusboyEvents['file'] {
  const {
    ctx: { aws, db },
    resolve,
    reject,
  } = params;
  const handler = db.getHandler();
  const {
    file: { model: fileModel },
  } = db.getModels();
  const s3Client = aws.getClient();

  return async (_, file, info) => {
    try {
      const { filename, encoding, mimeType } = info;
      const id = randomUUID();
      const extension = mime.extension(mimeType);
      const newFileName = `${id}.${extension}`;

      const results = await Promise.allSettled([
        s3Client.send(
          new PutObjectCommand({
            Bucket: aws.getBucketName(),
            Key: newFileName,
            Body: file,
          })
        ),
        handler.insert(fileModel).values({
          name: filename,
          encoding: encoding,
          mimeType: mimeType,
          storageMedium: 's3',
          path: newFileName,
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

export function uploadS3SecureFileEventHandler(params: {
  ctx: RequestContext;
  resolve: Resolve;
  reject: Reject;
}): BusboyEvents['file'] {
  const {
    ctx: { aws, encryption, db },
    resolve,
    reject,
  } = params;
  const handler = db.getHandler();
  const {
    file: { model: fileModel },
  } = db.getModels();
  const client = aws.getClient();

  return async (_, file, info) => {
    try {
      const { filename, encoding, mimeType } = info;
      const id = randomUUID();
      const extension = mime.extension(mimeType);
      const cipher = encryption.getEncryptionPipe();
      const newFileName = `${id}.${extension}`;

      const trackingStream = new Transform({
        transform: (chunk, _, cb) => {
          return cb(null, cipher.update(chunk));
        },
        flush: (cb) => {
          return cb(null, cipher.final());
        },
      });

      const results = await Promise.allSettled([
        client.send(
          new PutObjectCommand({
            Bucket: aws.getBucketName(),
            Key: newFileName,
            Body: file.pipe(trackingStream),
          })
        ),
        handler.insert(fileModel).values({
          name: filename,
          encoding: encoding,
          mimeType: mimeType,
          storageMedium: 's3',
          path: newFileName,
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
