class ApiError extends Error {
    constructor(statusCode, message = "Something went wrong", errors = [], stack = "") {
        super(message) // we use super because message is coming from the parent class
        this.statusCode = statusCode;
        this.errors = errors;
        this.message = message;
        this.data = null;
        this.success = false;
        if (stack) {
            this.stack = stack;
        } else {
            Error.captupreStackTrace(this, this.constructor) //Captures the exact file and line number 
            // where the error was thrown, making debugging far easier
        }

    }
}

export { ApiError }