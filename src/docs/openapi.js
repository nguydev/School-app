const resources = {
  courses: {
    body: {
      title: 'string',
      description: 'string',
      image: 'string',
      coreSubjects: 'array',
      videoCount: 'number (server calculated)',
      pdfCount: 'number (server calculated)',
      status: 'ACTIVE | INACTIVE | ARCHIVED',
      order: 'number',
    },
  },
  groups: {
    body: {
      courseId: 'MongoDB ObjectId',
      title: 'string',
      description: 'string',
      image: 'string',
      videoCount: 'number (server calculated)',
      pdfCount: 'number (server calculated)',
      status: 'ACTIVE | INACTIVE | ARCHIVED',
      order: 'number',
    },
  },
  subjects: {
    body: {
      courseId: 'MongoDB ObjectId',
      groupId: 'MongoDB ObjectId | null',
      subjectName: 'string',
      title: 'string',
      description: 'string',
      image: 'string',
      subjectType: 'GROUP | COMMON',
      chapters: 'number (server calculated)',
      videoCount: 'number (server calculated)',
      pdfCount: 'number (server calculated)',
      status: 'ACTIVE | INACTIVE | ARCHIVED',
      order: 'number',
    },
  },
  books: {
    body: {
      courseId: 'MongoDB ObjectId',
      groupId: 'MongoDB ObjectId | null',
      subjectId: 'MongoDB ObjectId',
      title: 'string',
      description: 'string',
      image: 'string',
      author: 'string',
      publicationYear: 'number',
      chapterCount: 'number (server calculated)',
      videoCount: 'number (server calculated)',
      pdfCount: 'number (server calculated)',
      status: 'ACTIVE | INACTIVE | ARCHIVED',
      order: 'number',
    },
  },
  chapters: {
    body: {
      courseId: 'MongoDB ObjectId',
      groupId: 'MongoDB ObjectId | null',
      subjectId: 'MongoDB ObjectId',
      bookId: 'MongoDB ObjectId',
      title: 'string',
      description: 'string',
      videoCount: 'number (server calculated)',
      pdfCount: 'number (server calculated)',
      status: 'ACTIVE | INACTIVE | ARCHIVED',
      order: 'number',
    },
  },
  videos: {
    body: {
      schoolId: 'string | null',
      courseId: 'MongoDB ObjectId',
      groupId: 'MongoDB ObjectId | null',
      subjectId: 'MongoDB ObjectId',
      bookId: 'MongoDB ObjectId',
      chapterId: 'MongoDB ObjectId',
      title: 'string',
      description: 'string',
      mediaAssetId: 'MongoDB ObjectId (verified Cloudinary asset)',
      duration: 'number (seconds)',
      thumbnail: 'string',
      status: 'DRAFT | PUBLISHED | ARCHIVED',
      order: 'number',
    },
  },
  pdfs: {
    body: {
      schoolId: 'string | null',
      courseId: 'MongoDB ObjectId',
      groupId: 'MongoDB ObjectId | null',
      subjectId: 'MongoDB ObjectId',
      bookId: 'MongoDB ObjectId',
      chapterId: 'MongoDB ObjectId',
      title: 'string',
      description: 'string',
      mediaAssetId: 'MongoDB ObjectId (verified Cloudinary asset)',
      totalPages: 'number',
      fileSize: 'number (bytes)',
      status: 'DRAFT | PUBLISHED | ARCHIVED',
      order: 'number',
    },
  },
};

const paths = {};
const jsonBody = (schema) => ({
  required: true,
  content: {
    'application/json': { schema },
  },
});

for (const [resource, { body }] of Object.entries(resources)) {
  const collectionPath = `/api/v1/admin/${resource}`;
  const itemPath = `${collectionPath}/{id}`;
  paths[collectionPath] = {
    get: {
      tags: [resource],
      summary: `List ${resource} with filtering and pagination`,
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1 } },
        { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100 } },
        { in: 'query', name: 'search', schema: { type: 'string' } },
        { in: 'query', name: 'status', schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Paginated resource list' }, 401: { description: 'Authentication required' }, 403: { description: 'Admin role required' } },
    },
    post: {
      tags: [resource],
      summary: `Create ${resource.slice(0, -1)}`,
      security: [{ bearerAuth: [] }],
      requestBody: jsonBody({
        type: 'object',
        properties: Object.fromEntries(Object.entries(body).map(([name, description]) => [name, { description }])),
      }),
      responses: { 201: { description: 'Created' }, 400: { description: 'Validation or parent reference error' }, 409: { description: 'Duplicate record' } },
    },
  };
  paths[itemPath] = {
    get: {
      tags: [resource],
      summary: `Get ${resource.slice(0, -1)}`,
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Resource details' }, 404: { description: 'Not found' } },
    },
    patch: {
      tags: [resource],
      summary: `Update ${resource.slice(0, -1)}`,
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: jsonBody({ type: 'object' }),
      responses: { 200: { description: 'Updated' }, 400: { description: 'Validation or relationship error' } },
    },
    delete: {
      tags: [resource],
      summary: `Archive ${resource.slice(0, -1)}`,
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Archived' }, 409: { description: 'Active dependent records exist' } },
    },
  };
}

paths['/api/v1/admin/media-assets/upload-signature'] = {
  post: {
    tags: ['media-assets'],
    summary: 'Create a five-minute signed Cloudinary upload',
    security: [{ bearerAuth: [] }],
    requestBody: jsonBody({
      type: 'object',
      required: ['resourceType'],
      properties: { resourceType: { type: 'string', enum: ['video', 'raw'] } },
    }),
    responses: { 200: { description: 'Signed upload parameters' }, 503: { description: 'Cloudinary is not configured' } },
  },
};
paths['/api/v1/admin/media-assets/confirm'] = {
  post: {
    tags: ['media-assets'],
    summary: 'Verify an authenticated Cloudinary upload and register its metadata',
    security: [{ bearerAuth: [] }],
    requestBody: jsonBody({
      type: 'object',
      required: ['resourceType', 'publicId'],
      properties: {
        resourceType: { type: 'string', enum: ['video', 'raw'] },
        publicId: { type: 'string' },
      },
    }),
    responses: { 201: { description: 'Verified media asset' }, 400: { description: 'Upload could not be verified' } },
  },
};
paths['/api/v1/admin/media-assets/{id}/access-url'] = {
  get: {
    tags: ['media-assets'],
    summary: 'Create a five-minute signed URL for a private media asset',
    security: [{ bearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    responses: {
      200: { description: 'Short-lived signed media URL' },
      404: { description: 'Media asset not found' },
      503: { description: 'Cloudinary is not configured' },
    },
  },
};

module.exports = {
  openapi: '3.0.3',
  info: { title: 'School App Management API', version: '1.0.0' },
  servers: [{ url: '/' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths,
};
