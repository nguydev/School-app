const { randomUUID } = require('node:crypto');
const cloudinary = require('../config/cloudinary');
const env = require('../config/env');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const detectImageFormat = require('../utils/imageFormat');

const maxImageBytes = 5 * 1024 * 1024;
const allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif'];

function assertConfigured() {
  if (!env.cloudinary.configured) {
    throw new ApiError(
      503,
      'Cloudinary is not configured',
      'CLOUDINARY_NOT_CONFIGURED',
    );
  }
}

function uploadImage(buffer) {
  assertConfigured();

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ApiError(400, 'An image file is required', 'IMAGE_REQUIRED');
  }
  if (buffer.length > maxImageBytes) {
    throw new ApiError(413, 'Image exceeds the 5 MB limit', 'IMAGE_TOO_LARGE');
  }

  const format = detectImageFormat(buffer);
  if (!format) {
    throw new ApiError(
      415,
      'Only JPEG, PNG, WebP, and AVIF images are supported',
      'UNSUPPORTED_IMAGE_FORMAT',
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: env.cloudinary.folder,
        public_id: randomUUID(),
        overwrite: false,
        unique_filename: false,
        allowed_formats: allowedFormats,
      },
      (error, result) => {
        if (error) {
          logger.error(
            { errorName: error.name, httpCode: error.http_code },
            'Cloudinary image upload failed',
          );
          reject(
            new ApiError(502, 'Image upload failed', 'CLOUDINARY_UPLOAD_FAILED'),
          );
          return;
        }

        if (!result?.public_id || !result.secure_url) {
          reject(
            new ApiError(502, 'Cloudinary returned an invalid response', 'CLOUDINARY_INVALID_RESPONSE'),
          );
          return;
        }

        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      },
    );

    stream.end(buffer);
  });
}

async function deleteImage(publicId) {
  assertConfigured();

  const prefix = `${env.cloudinary.folder}/`;
  const segments = typeof publicId === 'string' ? publicId.split('/') : [];
  if (
    typeof publicId !== 'string' ||
    publicId.length > 255 ||
    !publicId.startsWith(prefix) ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new ApiError(400, 'Invalid Cloudinary public ID', 'INVALID_PUBLIC_ID');
  }

  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
  } catch (error) {
    logger.error(
      { errorName: error.name, httpCode: error.http_code },
      'Cloudinary image deletion failed',
    );
    throw new ApiError(502, 'Image deletion failed', 'CLOUDINARY_DELETE_FAILED');
  }
}

module.exports = {
  maxImageBytes,
  uploadImage,
  deleteImage,
};
