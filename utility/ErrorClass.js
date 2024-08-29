class CustomError extends Error {
  constructor(code, message, originalError = null) {
    super(message);
    this.code = code;
    this.originalError = originalError;
  }
}

module.exports = { CustomError };
