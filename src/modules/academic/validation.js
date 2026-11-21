const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ID');
const nullableId = objectId.nullable();
const status = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']);
const mediaStatus = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const text = (max, required = true) => {
  const schema = z.string().trim().min(required ? 1 : 0).max(max);
  return required ? schema : schema.optional();
};
const count = z.number().int().min(0).optional();
const order = z.number().int().min(0).max(1000000).optional();

function request(body, params = z.object({}), query = z.object({})) {
  return z.object({ body, params, query });
}

function withIgnoredCounts(shape) {
  return {
    ...shape,
    videoCount: count,
    pdfCount: count,
    chapterCount: count,
    chapters: count,
  };
}

function hasEditableField(value) {
  return Object.keys(value).some(
    (field) => !['videoCount', 'pdfCount', 'chapterCount', 'chapters'].includes(field),
  );
}

const definitions = {
  courses: {
    create: request(z.object(withIgnoredCounts({
      title: text(120),
      description: text(4000, false).default(''),
      image: text(2048, false).default(''),
      coreSubjects: z.array(objectId).max(500).default([]),
      status: status.default('ACTIVE'),
      order,
    })).strict()),
    update: request(z.object(withIgnoredCounts({
      title: text(120).optional(),
      description: text(4000, false),
      image: text(2048, false),
      coreSubjects: z.array(objectId).max(500).optional(),
      status: status.optional(),
      order,
    })).strict().refine(hasEditableField)),
    filters: {},
  },
  groups: {
    create: request(z.object(withIgnoredCounts({
      courseId: objectId,
      title: text(120),
      description: text(4000, false).default(''),
      image: text(2048, false).default(''),
      status: status.default('ACTIVE'),
      order,
    })).strict()),
    update: request(z.object(withIgnoredCounts({
      courseId: objectId.optional(),
      title: text(120).optional(),
      description: text(4000, false),
      image: text(2048, false),
      status: status.optional(),
      order,
    })).strict().refine(hasEditableField)),
    filters: { courseId: objectId },
  },
  subjects: {
    create: request(z.object(withIgnoredCounts({
      courseId: objectId,
      groupId: nullableId,
      subjectName: text(120),
      title: text(160),
      description: text(4000, false).default(''),
      image: text(2048, false).default(''),
      subjectType: z.enum(['GROUP', 'COMMON']),
      status: status.default('ACTIVE'),
      order,
    })).strict()),
    update: request(z.object(withIgnoredCounts({
      courseId: objectId.optional(),
      groupId: nullableId.optional(),
      subjectName: text(120).optional(),
      title: text(160).optional(),
      description: text(4000, false),
      image: text(2048, false),
      subjectType: z.enum(['GROUP', 'COMMON']).optional(),
      status: status.optional(),
      order,
    })).strict().refine(hasEditableField)),
    filters: { courseId: objectId, groupId: nullableId, subjectType: z.enum(['GROUP', 'COMMON']) },
  },
  books: {
    create: request(z.object(withIgnoredCounts({
      courseId: objectId,
      groupId: nullableId,
      subjectId: objectId,
      title: text(200),
      description: text(4000, false).default(''),
      image: text(2048, false).default(''),
      author: text(160),
      publicationYear: z.number().int().min(1000).max(3000),
      status: status.default('ACTIVE'),
      order,
    })).strict()),
    update: request(z.object(withIgnoredCounts({
      courseId: objectId.optional(),
      groupId: nullableId.optional(),
      subjectId: objectId.optional(),
      title: text(200).optional(),
      description: text(4000, false),
      image: text(2048, false),
      author: text(160).optional(),
      publicationYear: z.number().int().min(1000).max(3000).optional(),
      status: status.optional(),
      order,
    })).strict().refine(hasEditableField)),
    filters: { courseId: objectId, groupId: nullableId, subjectId: objectId },
  },
  chapters: {
    create: request(z.object(withIgnoredCounts({
      courseId: objectId,
      groupId: nullableId,
      subjectId: objectId,
      bookId: objectId,
      title: text(200),
      description: text(4000, false).default(''),
      status: status.default('ACTIVE'),
      order,
    })).strict()),
    update: request(z.object(withIgnoredCounts({
      courseId: objectId.optional(),
      groupId: nullableId.optional(),
      subjectId: objectId.optional(),
      bookId: objectId.optional(),
      title: text(200).optional(),
      description: text(4000, false),
      status: status.optional(),
      order,
    })).strict().refine(hasEditableField)),
    filters: { courseId: objectId, groupId: nullableId, subjectId: objectId, bookId: objectId },
  },
  videos: {
    create: request(z.object(withIgnoredCounts({
      schoolId: z.string().trim().min(1).max(128).nullable().optional(),
      courseId: objectId,
      groupId: nullableId,
      subjectId: objectId,
      bookId: objectId,
      chapterId: objectId,
      title: text(200),
      description: text(4000, false).default(''),
      mediaAssetId: objectId,
      duration: z.number().int().min(1).max(86400),
      thumbnail: text(2048, false).default(''),
      status: mediaStatus.default('DRAFT'),
      order,
    })).strict()),
    update: request(z.object(withIgnoredCounts({
      schoolId: z.string().trim().min(1).max(128).nullable().optional(),
      courseId: objectId.optional(),
      groupId: nullableId.optional(),
      subjectId: objectId.optional(),
      bookId: objectId.optional(),
      chapterId: objectId.optional(),
      title: text(200).optional(),
      description: text(4000, false),
      mediaAssetId: objectId.optional(),
      duration: z.number().int().min(1).max(86400).optional(),
      thumbnail: text(2048, false),
      status: mediaStatus.optional(),
      order,
    })).strict().refine(hasEditableField)),
    filters: {
      courseId: objectId, groupId: nullableId, subjectId: objectId,
      bookId: objectId, chapterId: objectId,
    },
  },
  pdfs: {
    create: request(z.object(withIgnoredCounts({
      schoolId: z.string().trim().min(1).max(128).nullable().optional(),
      courseId: objectId,
      groupId: nullableId,
      subjectId: objectId,
      bookId: objectId,
      chapterId: objectId,
      title: text(200),
      description: text(4000, false).default(''),
      mediaAssetId: objectId,
      totalPages: z.number().int().min(1).max(100000),
      fileSize: z.number().int().min(1).max(2147483648),
      status: mediaStatus.default('DRAFT'),
      order,
    })).strict()),
    update: request(z.object(withIgnoredCounts({
      schoolId: z.string().trim().min(1).max(128).nullable().optional(),
      courseId: objectId.optional(),
      groupId: nullableId.optional(),
      subjectId: objectId.optional(),
      bookId: objectId.optional(),
      chapterId: objectId.optional(),
      title: text(200).optional(),
      description: text(4000, false),
      mediaAssetId: objectId.optional(),
      totalPages: z.number().int().min(1).max(100000).optional(),
      fileSize: z.number().int().min(1).max(2147483648).optional(),
      status: mediaStatus.optional(),
      order,
    })).strict().refine(hasEditableField)),
    filters: {
      courseId: objectId, groupId: nullableId, subjectId: objectId,
      bookId: objectId, chapterId: objectId,
    },
  },
};

const paginationFields = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.string().optional(),
  sortBy: z.enum(['order', 'title', 'createdAt', 'updatedAt', 'subjectName']).default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
};

const idParams = request(z.object({}), z.object({ id: objectId }), z.object({}));
for (const definition of Object.values(definitions)) {
  definition.list = request(z.object({}), z.object({}), z.object({
    ...paginationFields,
    ...Object.fromEntries(
      Object.entries(definition.filters).map(([field, schema]) => [field, schema.optional()]),
    ),
  }));
}

module.exports = { definitions, idParams, objectId };
