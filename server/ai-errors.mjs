export class AiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
