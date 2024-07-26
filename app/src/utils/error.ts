export default class NodeTemplateError extends Error {
  readonly #msg;
  readonly #code;

  public constructor(msg: string, code: number) {
    super(msg);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);

    this.#msg = msg;
    this.#code = code;
  }

  public getMessage() {
    return this.#msg;
  }

  public getCode() {
    return this.#code;
  }
}
