const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middlewares/validate');
const controller = require('./mediaAsset.controller');
const schemas = require('./mediaAsset.validation');

const router = express.Router();

router.post('/upload-signature', validate(schemas.uploadSignature), asyncHandler(controller.uploadSignature));
router.post('/confirm', validate(schemas.confirmUpload), asyncHandler(controller.confirmUpload));
router.get('/:id/access-url', validate(schemas.assetParams), asyncHandler(controller.accessUrl));

module.exports = router;
