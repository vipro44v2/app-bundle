export class AppError extends Error {
  constructor(
    message: string,
    readonly status = 500,
    readonly code = "SERVER_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}
