class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong", errors = [], stack = "") {
    super(message); // we use super because message is coming from the parent class
    this.statusCode = statusCode;
    this.errors = errors;
    this.message = message;
    this.data = null;
    this.success = false;
    if (stack) {
      this.stack = stack;
    } else if (typeof Error.captureStackTrace === "function") {
      // V8/Node.js only — captures exact file and line number where error was thrown
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
