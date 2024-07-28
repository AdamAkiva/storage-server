import { encryptStream } from '../../utils.js';

import {
  BusBoy,
  createWriteStream,
  mime,
  pipeline,
  PutObjectCommand,
  randomUUID,
  Readable,
  VALIDATION,
  type BusboyEvents,
  type EventHandler,
  type Reject,
  type Request,
  type RequestContext,
  type Resolve,
} from '../../../utils/index.js';

/**********************************************************************************/

export async function uploadToDisk(params: {
  req: Request;
  ctx: RequestContext;
  eventHandler: EventHandler<string>;
}) {
  const { req, ctx, eventHandler } = params;

  return await new Promise<string>((resolve, reject) => {
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

export async function uploadToS3(params: {
  req: Request;
  ctx: RequestContext;
  eventHandler: EventHandler<string>;
}) {
  const { req, ctx, eventHandler } = params;

  return await new Promise<string>((resolve, reject) => {
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

export function uploadFileToDiskEventHandler(params: {
  ctx: RequestContext;
  resolve: Resolve<string>;
  reject: Reject;
}): BusboyEvents['file'] {
  const {
    ctx: { diskFilesPath, db },
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
      const filePath = `${diskFilesPath}/${id}.${mime.extension(mimeType)}`;

      const results = await Promise.allSettled([
        pipeline(file, createWriteStream(filePath)),
        handler.insert(fileModel).values({
          id: id,
          name: filename,
          encoding: encoding,
          mimeType: mimeType,
          storageMedium: 'disk',
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

      return resolve(id);
    } catch (err) {
      return reject(err);
    }
  };
}

export function uploadSecureFileToDiskEventHandler(params: {
  ctx: RequestContext;
  resolve: Resolve<string>;
  reject: Reject;
}): BusboyEvents['file'] {
  const {
    ctx: { diskFilesPath, encryption, db },
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
      const filePath = `${diskFilesPath}/${id}.${mime.extension(mimeType)}`;
      const cipher = encryption.createEncryptionCipher();

      const results = await Promise.allSettled([
        pipeline(file, encryptStream(cipher), createWriteStream(filePath)),
        handler.insert(fileModel).values({
          id: id,
          name: filename,
          encoding: encoding,
          mimeType: mimeType,
          storageMedium: 'disk',
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

      return resolve(id);
    } catch (err) {
      return reject(err);
    }
  };
}

/**********************************************************************************/

export function uploadFileToS3EventHandler(params: {
  ctx: RequestContext;
  resolve: Resolve<string>;
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
      const newFileName = `${id}.${mime.extension(mimeType)}`;

      const results = await Promise.allSettled([
        s3Client.send(
          new PutObjectCommand({
            Bucket: aws.getBucketName(),
            Key: newFileName,
            Body: file,
          })
        ),
        handler.insert(fileModel).values({
          id: id,
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

      return resolve(id);
    } catch (err) {
      return reject(err);
    }
  };
}

export function uploadSecureFileToS3EventHandler(params: {
  ctx: RequestContext;
  resolve: Resolve<string>;
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
      const newFileName = `${id}.${mime.extension(mimeType)}`;
      const cipher = encryption.createEncryptionCipher();

      const results = await Promise.allSettled([
        client.send(
          new PutObjectCommand({
            Bucket: aws.getBucketName(),
            Key: newFileName,
            Body: Readable.from(encryptStream(cipher)(file)),
          })
        ),
        handler.insert(fileModel).values({
          id: id,
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

      return resolve(id);
    } catch (err) {
      return reject(err);
    }
  };
}
