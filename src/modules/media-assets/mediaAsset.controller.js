const service = require('./mediaAsset.service');

async function uploadSignature(req, res) {
  const data = service.createUploadSignature(req.validated.body.resourceType);
  res.status(200).json({ success: true, data });
}

async function confirmUpload(req, res) {
  const asset = await service.confirmUpload(req.validated.body);
  res.status(201).json({ success: true, data: { item: asset } });
}

async function accessUrl(req, res) {
  const data = await service.createAccessUrl(req.validated.params.id);
  res.status(200).json({ success: true, data });
}

module.exports = { uploadSignature, confirmUpload, accessUrl };
