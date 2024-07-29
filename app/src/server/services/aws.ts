import { S3Client, type NodeJsClient } from '../../utils/index.js';

/**********************************************************************************/

export default class AWS {
  readonly #client;
  readonly #bucketName;

  public constructor(params: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
  }) {
    const { region, accessKeyId, secretAccessKey, bucketName } = params;

    this.#client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
      // See: https://stackoverflow.com/a/76946804
    }) as NodeJsClient<S3Client>;
    this.#bucketName = bucketName;
  }

  public getClient() {
    return this.#client;
  }

  public getBucketName() {
    return this.#bucketName;
  }
}
