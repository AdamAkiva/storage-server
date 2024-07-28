import type { readFile } from '../validator.js';

import {
  decryptStream,
  entityNotFoundError,
  storageMediumMismatchError,
  streamFileError,
} from '../../utils.js';

import { createReadStream } from 'fs';
import {
  eq,
  pipeline,
  type RequestContext,
  type ResponseWithCtx,
} from '../../../utils/index.js';

/**********************************************************************************/

type ReadFileValidationData = ReturnType<typeof readFile>['id'];

/**********************************************************************************/

export async function readFileFromDisk(
  id: ReadFileValidationData,
  res: ResponseWithCtx
) {
  const fileData = await readFileDatabaseEntry(id, res.locals.ctx.db);

  if (fileData.secured) {
    return await readSecuredFileFromDiskHandler(fileData, res);
  }

  return await readFileFromDiskHandler(fileData, res);
}

export async function readFileFromS3(
  id: ReadFileValidationData,
  res: ResponseWithCtx
) {}

/**********************************************************************************/

async function readFileDatabaseEntry(id: string, db: RequestContext['db']) {
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
  if (fileData.storageMedium !== 'disk') {
    throw storageMediumMismatchError();
  }

  return {
    name: fileData.name,
    mimeType: fileData.mimeType,
    path: fileData.path,
    secured: fileData.secured,
  };
}

/**********************************************************************************/

async function readFileFromDiskHandler(
  fileData: Awaited<ReturnType<typeof readFileDatabaseEntry>>,
  res: ResponseWithCtx
) {
  try {
    res
      .setHeader('Content-Type', fileData.mimeType)
      .setHeader(
        'Content-Disposition',
        `attachment; filename="${fileData.name}"`
      );

    // eslint-disable-next-line @security/detect-non-literal-fs-filename
    await pipeline(createReadStream(fileData.path), res);
  } catch (err) {
    console.error('Error streaming file:\n', err);
    throw streamFileError();
  }
}

async function readSecuredFileFromDiskHandler(
  fileData: Awaited<ReturnType<typeof readFileDatabaseEntry>>,
  res: ResponseWithCtx
) {
  try {
    const decipher = res.locals.ctx.encryption.createDecryptionCipher();

    res
      .setHeader('Content-Type', fileData.mimeType)
      .setHeader(
        'Content-Disposition',
        `attachment; filename="${fileData.name}"`
      );

    // eslint-disable-next-line @security/detect-non-literal-fs-filename
    await pipeline(
      createReadStream(fileData.path),
      decryptStream(decipher),
      res
    );
  } catch (err) {
    console.error('Error streaming file:\n', err);
    throw streamFileError();
  }
}

async function readFileFromS3Handler() {}

async function readSecuredFileFromS3Handler() {}
