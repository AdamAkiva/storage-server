import type { uploadFile as uploadFileValidator } from '../validator.js';

import { checkFileSize } from '../../utils.js';

import {
  BusBoy,
  createWriteStream,
  mime,
  pipeline,
  PutObjectCommand,
  randomUUID,
  Readable,
  VALIDATION,
  type AllowedStorageMediums,
  type BusboyEvents,
  type Cipher,
  type Reject,
  type Request,
  type RequestContext,
  type Resolve,
  type WriteStream,
} from '../../../utils/index.js';

/**********************************************************************************/

type UploadFileValidationData = ReturnType<typeof uploadFileValidator>;

type EventHandler<T = unknown> = (params: {
  ctx: RequestContext;
  secured: boolean;
  resolve: Resolve<T>;
  reject: Reject;
}) => BusboyEvents['file'];

const { BUFFER_SIZE } = VALIDATION;

/**********************************************************************************/

export async function uploadFile(params: {
  req: Request;
  ctx: RequestContext;
  encrypt: UploadFileValidationData['encryption'];
  eventHandler: EventHandler<string>;
}) {
  const { req, ctx, encrypt, eventHandler } = params;

  return await new Promise<string>((resolve, reject) => {
    req.pipe(
      BusBoy({
        headers: req.headers,
        highWaterMark: BUFFER_SIZE,
      })
        .on('error', (error) => {
          reject(error);
        })
        .on(
          'file',
          eventHandler({
            ctx: ctx,
            secured: encrypt === 'encrypt',
            resolve: resolve,
            reject: reject,
          })
        )
    );
  });
}

/**********************************************************************************/

async function createFileDatabaseEntry(
  fileInfo: {
    id: string;
    name: string;
    encoding: string;
    mimeType: string;
    storageMedium: AllowedStorageMediums;
    path: string;
    secured: boolean;
  },
  db: RequestContext['db']
) {
  const handler = db.getHandler();
  const {
    file: { model: fileModel },
  } = db.getModels();

  await handler.insert(fileModel).values(fileInfo);
}

export function uploadFileToDiskHandler(params: {
  ctx: RequestContext;
  secured: boolean;
  resolve: Resolve<string>;
  reject: Reject;
}): BusboyEvents['file'] {
  const {
    ctx: { diskFilesPath, db, encryption },
    secured,
    resolve,
    reject,
  } = params;

  return async (_, file, info) => {
    try {
      const { filename, encoding, mimeType } = info;
      const id = randomUUID();
      const filePath = `${diskFilesPath}/${id}.${mime.extension(mimeType)}`;

      const results = await Promise.allSettled([
        initDiskPipeline({
          src: file,
          dest: createWriteStream(filePath),
          filePath: filePath,
          secured: secured,
          cipher: encryption.createEncryptionCipher(),
          reject: reject,
        }),
        createFileDatabaseEntry(
          {
            id: id,
            name: filename,
            encoding: encoding,
            mimeType: mimeType,
            storageMedium: 'disk',
            path: filePath,
            secured: secured,
          },
          db
        ),
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

export function uploadFileToS3EventHandler(params: {
  ctx: RequestContext;
  secured: boolean;
  resolve: Resolve<string>;
  reject: Reject;
}): BusboyEvents['file'] {
  const {
    ctx: { aws, db, encryption },
    secured,
    resolve,
    reject,
  } = params;

  return async (_, file, info) => {
    try {
      const { filename, encoding, mimeType } = info;
      const id = randomUUID();
      const newFileName = `${id}.${mime.extension(mimeType)}`;

      const results = await Promise.allSettled([
        initS3Pipeline({
          src: file,
          key: newFileName,
          secured: secured,
          cipher: encryption.createEncryptionCipher(),
          aws: aws,
          reject: reject,
        }),
        createFileDatabaseEntry(
          {
            id: id,
            name: filename,
            encoding: encoding,
            mimeType: mimeType,
            storageMedium: 's3',
            path: newFileName,
            secured: secured,
          },
          db
        ),
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

async function initDiskPipeline(params: {
  src: Readable;
  dest: WriteStream;
  filePath: string;
  secured: boolean;
  cipher: Cipher;
  reject: Reject;
}) {
  const { src, dest, filePath, secured, cipher, reject } = params;

  if (secured) {
    return await pipeline(
      src,
      encryptStream({ cipher: cipher, filePath: filePath, reject: reject }),
      dest
    );
  }

  return await pipeline(
    src,
    checkSizeStream({ filePath: filePath, reject: reject }),
    dest
  );
}

async function initS3Pipeline(params: {
  src: Readable;
  key: string;
  secured: boolean;
  cipher: Cipher;
  aws: RequestContext['aws'];
  reject: Reject;
}) {
  const { src, key, secured, cipher, aws, reject } = params;
  const s3Client = aws.getClient();
  const bucketName = aws.getBucketName();

  if (secured) {
    return await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: Readable.from(
          encryptStream({ cipher: cipher, reject: reject })(src)
        ),
      })
    );
  }

  return await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: Readable.from(checkSizeStream({ reject: reject })(src)),
    })
  );
}

function encryptStream(params: {
  cipher: Cipher;
  filePath?: string;
  reject: Reject;
}) {
  const { cipher, filePath, reject } = params;
  let fileSize = 0;

  return async function* (stream: Readable) {
    for await (const chunk of stream) {
      fileSize += chunk.length;
      checkFileSize({ fileSize: fileSize, filePath: filePath, reject: reject });
      yield cipher.update(chunk);
    }

    yield cipher.final();
  };
}

function checkSizeStream(params: { filePath?: string; reject: Reject }) {
  const { filePath, reject } = params;
  let fileSize = 0;

  return async function* (stream: Readable) {
    for await (const chunk of stream) {
      fileSize += chunk.length;
      checkFileSize({ fileSize: fileSize, filePath: filePath, reject: reject });
      yield chunk;
    }
  };
}
