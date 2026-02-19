module.exports = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.details.map(err => err.message)
      });
    }

    req[property] = value; // sanitized data
    next();
  };
};
