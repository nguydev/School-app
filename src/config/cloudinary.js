const { v2: cloudinary } = require('cloudinary');
const env = require('./env');

if (env.cloudinary.configured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
    timeout: 30000,
  });
}

module.exports = cloudinary;
