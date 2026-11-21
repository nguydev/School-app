const multer = require('multer');
const ApiError = require('../utils/ApiError');
const detectImageFormat = require('../utils/imageFormat');

const mimeByFormat = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 10,
    fieldNameSize: 100,
    fieldSize: 16 * 1024,
    parts: 11,
  },
  fileFilter(_req, file, callback) {
    if (!Object.values(mimeByFormat).includes(file.mimetype)) {
      callback(
        new ApiError(
          415,
          'Only JPEG, PNG, WebP, and AVIF images are supported',
          'UNSUPPORTED_IMAGE_FORMAT',
        ),
      );
      return;
    }

    callback(null, true);
  },
});

function uploadSingleImage(fieldName = 'image') {
  if (typeof fieldName !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(fieldName)) {
    return (_req, _res, next) =>
      next(new ApiError(500, 'Invalid upload field configuration', 'INVALID_UPLOAD_CONFIG'));
  }

  return function parseImageUpload(req, res, next) {
    upload.single(fieldName)(req, res, (error) => {
      if (error) {
        return next(error);
      }

      if (!req.file) {
        return next(new ApiError(400, 'An image file is required', 'IMAGE_REQUIRED'));
      }

      const format = detectImageFormat(req.file.buffer);
      if (!format || mimeByFormat[format] !== req.file.mimetype) {
        return next(
          new ApiError(
            415,
            'Uploaded file content does not match an allowed image format',
            'UNSUPPORTED_IMAGE_FORMAT',
          ),
        );
      }

      return next();
    });
  };
}

module.exports = {
  uploadSingleImage,
};
