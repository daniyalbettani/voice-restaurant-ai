import { ApiError } from "../utils/ApiError.js"

const errorHandler = (err, req, res, next) => {
    let error = err; // ye err ko direct use nahi kar sakte es liye variable may store karte hien aur 
    // ye err hamare asynHandler ke .catch me se arha hai, next(error) ke vajah se
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal Server Error";
        error = new ApiError(statusCode, message, [], err.stack)
    }

    const response = {
        statusCode: error.statusCode,
        message: error.message,
        success: false,
        error: error.errors,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack })
    }
    return res.status(error.statusCode).json(response);
}

export { ApiError }


// Scenario A: You intentionally threw an error
// You wrote throw new ApiError(400, "Invalid Email") inside a controller.

// error instanceof ApiError evaluates to true.

// !(true) flips it to false.

// The if block SKIPS. Your error is already formatted properly with a status code and message, so we don't touch it.

// Scenario B: JavaScript crashed unexpectedly
// A typo happened in your code (e.g., const name = undefined.trim()). Node generates a raw system TypeError.

// error instanceof ApiError evaluates to false.

// !(false) flips it to true.

// The if block RUNS. It wraps that raw crash inside a new ApiError(500, "Internal Server Error") so your app returns a clean JSON error instead of sending a messy HTML stack trace or crashing.

// How It Works Step-by-Step1. Inside Your Controller (Instantiation)When you write this in your code:JavaScriptthrow new ApiError(404, "Pizza not found");
// The constructor inside ApiError.js immediately executes and builds an object with these exact properties attached:JavaScript{
//   statusCode: 404,
//   message: "Pizza not found",
//   success: false,
//   errors: []
// }
// 2. Inside error.middleware.js (Handling)When that error arrives at errorHandler(err, req, res, next):JavaScript// Checks: Is 'err' created from our ApiError class?
// if (!(error instanceof ApiError)) {
//   // SKIPPED! Because 'error' already has statusCode (404), message, success, etc.
// }

// // 3. It takes those pre-formatted properties and sends them directly to React:
// const response = {
//   statusCode: error.statusCode, // 404
//   message: error.message,       // "Pizza not found"
//   success: error.success,       // false
//   errors: error.errors,
// };

// return res.status(error.statusCode).json(response);
// Why the Contrast Mattersnew ApiError(400, "Invalid Email"): Already has .statusCode = 400 set by the ApiError constructor $\rightarrow$ if block SKIPS $\rightarrow$ Sent straight to React.undefined.length (Raw JS Crash): Standard Node errors do not have .statusCode or .success properties attached $\rightarrow$ if block RUNS to add .statusCode = 500 and wrap it neatly before sending to React.