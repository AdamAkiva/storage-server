import type { readFile as readFileValidator } from '../validator.js';

import {
  entityNotFoundError,
  storageMediumMismatchError,
  streamFileError,
} from '../../utils.js';

import {
  createReadStream,
  eq,
  GetObjectCommand,
  pipeline,
  type AllowedStorageMediums,
  type Decipher,
  type Readable,
  type RequestContext,
  type ResponseWithCtx,
} from '../../../utils/index.js';

/**********************************************************************************/

type ReadFileValidationData = ReturnType<typeof readFileValidator>['id'];

/**********************************************************************************/

export async function readFile(params: {
  id: ReadFileValidationData;
  storageMedium: AllowedStorageMediums;
  res: ResponseWithCtx;
  eventHandler: (params: {
    fileData: Awaited<ReturnType<typeof readFileDatabaseEntry>>;
    res: ResponseWithCtx;
    secured: boolean;
  }) => Promise<void>;
}) {
  const { id, storageMedium, res, eventHandler } = params;

  const fileData = await readFileDatabaseEntry({
    id: id,
    db: res.locals.ctx.db,
    expectedStorageMedium: storageMedium,
  });

  return await eventHandler({
    fileData: fileData,
    res: res,
    secured: fileData.secured,
  });
}

/**********************************************************************************/

async function readFileDatabaseEntry(params: {
  id: string;
  db: RequestContext['db'];
  expectedStorageMedium: AllowedStorageMediums;
}) {
  const { id, db, expectedStorageMedium } = params;

  const handler = db.getHandler();
  const {
    file: { model: fileModel },
  } = db.getModels();

  const filesData = await handler
    .select({
      name: fileModel.name,
      mimeType: fileModel.mimeType,
      storageMedium: fileModel.storageMedium,
      path: fileModel.path,
      secured: fileModel.secured,
    })
    .from(fileModel)
    .where(eq(fileModel.id, id))
    .limit(1);

  if (!filesData.length) {
    throw entityNotFoundError('file', id);
  }
  const fileData = filesData[0];
  if (fileData.storageMedium !== expectedStorageMedium) {
    throw storageMediumMismatchError();
  }

  return {
    name: fileData.name,
    mimeType: fileData.mimeType,
    path: fileData.path,
    secured: fileData.secured,
  };
}

export async function readFileFromDiskHandler(params: {
  fileData: Awaited<ReturnType<typeof readFileDatabaseEntry>>;
  res: ResponseWithCtx;
  secured: boolean;
}) {
  try {
    const { fileData, res } = params;

    getResponseHeaders(fileData).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    return await initDiskPipeline(params);
  } catch (err) {
    throw streamFileError(err);
  }
}

export async function readFileFromS3Handler(params: {
  fileData: Awaited<ReturnType<typeof readFileDatabaseEntry>>;
  res: ResponseWithCtx;
  secured: boolean;
}) {
  try {
    const { fileData, res } = params;

    getResponseHeaders(fileData).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    return await initS3Pipeline(params);
  } catch (err) {
    throw streamFileError(err);
  }
}

/**********************************************************************************/

function getResponseHeaders(
  fileData: Awaited<ReturnType<typeof readFileDatabaseEntry>>
) {
  return [
    ['Content-Type', fileData.mimeType],
    ['Content-Disposition', `attachment; filename="${fileData.name}"`],
  ] as const;
}

async function initDiskPipeline(params: {
  fileData: Awaited<ReturnType<typeof readFileDatabaseEntry>>;
  res: ResponseWithCtx;
  secured: boolean;
}) {
  const { fileData, res, secured } = params;
  const { encryption } = res.locals.ctx;

  const srcStream = createReadStream(fileData.path);
  const destStream = res;
  if (secured) {
    return await pipeline(
      srcStream,
      decryptStream(encryption.createDecryptionCipher()),
      destStream
    );
  }

  return await pipeline(srcStream, destStream);
}

async function initS3Pipeline(params: {
  fileData: Awaited<ReturnType<typeof readFileDatabaseEntry>>;
  res: ResponseWithCtx;
  secured: boolean;
}) {
  const { fileData, res, secured } = params;
  const { aws, encryption } = res.locals.ctx;
  const s3Client = aws.getClient();

  const srcStream = s3Client.send(
    new GetObjectCommand({
      Bucket: aws.getBucketName(),
      Key: fileData.path,
    })
  );
  const destStream = res;
  if (secured) {
    return await pipeline(
      (await srcStream).Body!,
      decryptStream(encryption.createDecryptionCipher()),
      destStream
    );
  }

  return await pipeline((await srcStream).Body!, destStream);
}

function decryptStream(decipher: Decipher) {
  return async function* (stream: Readable) {
    for await (const chunk of stream) {
      yield decipher.update(chunk);
    }

    yield decipher.final();
  };
}
