const { z } = require('zod');

const resourceType = z.enum(['video', 'raw']);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ID');
const uploadSignature = z.object({
  body: z.object({ resourceType }),
  params: z.object({}),
  query: z.object({}),
});
const confirmUpload = z.object({
  body: z.object({
    resourceType,
    publicId: z.string().trim().min(1).max(255),
  }),
  params: z.object({}),
  query: z.object({}),
});
const assetParams = z.object({
  body: z.object({}),
  params: z.object({ id: objectId }),
  query: z.object({}),
});

module.exports = { uploadSignature, confirmUpload, assetParams };
