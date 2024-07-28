import {
  createCipheriv,
  createDecipheriv,
  createHash,
} from '../../utils/index.js';

/**********************************************************************************/

export default class Encryption {
  readonly #key;
  readonly #iv;
  readonly #algorithm;

  public constructor(params: { key: string; iv: string }) {
    const { key, iv } = params;

    this.#key = createHash('sha512')
      .update(key)
      .digest('base64')
      .substring(0, 32);
    this.#iv = createHash('sha512')
      .update(iv)
      .digest('base64')
      .substring(0, 16);
    this.#algorithm = 'aes-256-cbc';
  }

  public getEncryptionPipe() {
    return createCipheriv(this.#algorithm, this.#key, this.#iv);
  }

  public getDecryptionPipe() {
    return createDecipheriv(this.#algorithm, this.#key, this.#iv);
  }
}
