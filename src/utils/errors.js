class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error') {
    console.log(message);
    super('Internal Server Error', 500);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  InternalServerError
};
