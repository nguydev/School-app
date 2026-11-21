const { randomUUID } = require('node:crypto');
const cloudinary = require('../../config/cloudinary');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const MediaAsset = require('../academic/models').mediaAssets;

const maxAssetBytes = 2 * 1024 * 1024 * 1024;
const allowedFormats = {
  video: new Set(['mp4', 'webm', 'mov', 'm4v']),
  raw: new Set(['pdf']),
};

function assertConfigured() {
  if (!env.cloudinary.configured) {
    throw new ApiError(503, 'Cloudinary is not configured', 'CLOUDINARY_NOT_CONFIGURED');
  }
}

function validatePublicId(publicId) {
  const prefix = `${env.cloudinary.folder}/`;
  const segments = publicId.split('/');
  if (
    publicId.length > 255 ||
    !publicId.startsWith(prefix) ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new ApiError(400, 'Invalid Cloudinary public ID', 'INVALID_PUBLIC_ID');
  }
}

function createUploadSignature(resourceType) {
  assertConfigured();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${env.cloudinary.folder}/${randomUUID()}`;
  const params = {
    folder: env.cloudinary.folder,
    overwrite: false,
    public_id: publicId,
    timestamp,
    type: 'authenticated',
  };
  return {
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    resource_type: resourceType,
    upload_url: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/${resourceType}/upload`,
    params,
    signature: cloudinary.utils.api_sign_request(params, env.cloudinary.apiSecret),
    expires_at: new Date((timestamp + 300) * 1000),
    max_bytes: maxAssetBytes,
    allowed_formats: [...allowedFormats[resourceType]],
  };
}

async function confirmUpload({ resourceType, publicId }) {
  assertConfigured();
  validatePublicId(publicId);
  let resource;
  try {
    resource = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
      type: 'authenticated',
    });
  } catch (error) {
    if (error.http_code === 404) {
      throw new ApiError(400, 'Uploaded media was not found or is not authenticated', 'MEDIA_UPLOAD_NOT_FOUND');
    }
    throw new ApiError(502, 'Unable to verify uploaded media', 'MEDIA_PROVIDER_ERROR');
  }

  const format = String(resource.format || '').toLowerCase();
  if (
    !resource.public_id ||
    resource.public_id !== publicId ||
    !allowedFormats[resourceType].has(format) ||
    !resource.bytes ||
    resource.bytes > maxAssetBytes ||
    (resourceType === 'video' && (!resource.duration || resource.duration > 86400))
  ) {
    throw new ApiError(400, 'Uploaded media does not meet the supported format or size limits', 'INVALID_MEDIA_METADATA');
  }

  try {
    return await MediaAsset.findOneAndUpdate(
      { publicId },
      {
        $setOnInsert: {
          provider: 'cloudinary',
          resourceType,
          publicId,
          secureUrl: resource.secure_url,
          format,
          bytes: resource.bytes,
          ...(resourceType === 'video' ? { duration: Math.ceil(resource.duration) } : {}),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    ).lean();
  } catch (error) {
    if (error.code === 11000) {
      const existing = await MediaAsset.findOne({ publicId }).lean();
      if (existing?.resourceType === resourceType) return existing;
    }
    throw error;
  }
}

async function createAccessUrl(id) {
  assertConfigured();
  const asset = await MediaAsset.findById(id).lean();
  if (!asset) throw new ApiError(404, 'Media asset not found', 'MEDIA_ASSET_NOT_FOUND');
  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  return {
    url: cloudinary.utils.private_download_url(asset.publicId, asset.format, {
      resource_type: asset.resourceType,
      type: 'authenticated',
      expires_at: expiresAt,
    }),
    expires_at: new Date(expiresAt * 1000),
  };
}

module.exports = { createUploadSignature, confirmUpload, createAccessUrl };
