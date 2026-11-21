const mongoose = require('mongoose');
const ApiError = require('../../utils/ApiError');
const repository = require('./repository');

const parentFields = {
  groups: ['courseId'],
  subjects: ['courseId', 'groupId'],
  books: ['courseId', 'groupId', 'subjectId'],
  chapters: ['courseId', 'groupId', 'subjectId', 'bookId'],
  videos: ['courseId', 'groupId', 'subjectId', 'bookId', 'chapterId', 'mediaAssetId'],
  pdfs: ['courseId', 'groupId', 'subjectId', 'bookId', 'chapterId', 'mediaAssetId'],
};

function keyFor(resource, values) {
  const keyName = resource === 'subjects' ? 'subjectName' : 'title';
  return values[keyName]?.normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

function editableValues(resource, input) {
  const values = { ...input };
  for (const field of ['videoCount', 'pdfCount', 'chapterCount', 'chapters']) delete values[field];
  if (resource === 'courses' || resource === 'groups' || resource === 'books' || resource === 'chapters') {
    if (values.title !== undefined) values.titleKey = keyFor(resource, values);
  }
  if (resource === 'subjects' && values.subjectName !== undefined) {
    values.subjectKey = keyFor(resource, values);
  }
  return values;
}

async function requireActive(resource, id) {
  const document = await repository.findOne(resource, { _id: id, status: { $ne: 'ARCHIVED' } });
  if (!document) throw new ApiError(400, `Invalid or archived ${resource.slice(0, -1)} reference`, 'INVALID_PARENT_REFERENCE');
  return document;
}

async function validateParents(resource, values) {
  if (resource === 'courses') {
    if (values.coreSubjects?.length) {
      const subjects = await repository.modelFor('subjects').find({
        _id: { $in: values.coreSubjects },
        courseId: values._id,
        subjectType: 'COMMON',
        status: { $ne: 'ARCHIVED' },
      }).select('_id').lean();
      if (subjects.length !== values.coreSubjects.length) {
        throw new ApiError(400, 'Core subjects must be active common subjects belonging to this course', 'INVALID_CORE_SUBJECTS');
      }
    }
    return;
  }

  if (resource === 'groups') {
    await requireActive('courses', values.courseId);
    return;
  }

  if (resource === 'subjects') {
    await requireActive('courses', values.courseId);
    if (values.subjectType === 'COMMON' && values.groupId !== null) {
      throw new ApiError(400, 'Common subjects must have groupId set to null', 'INVALID_SUBJECT_GROUP');
    }
    if (values.subjectType === 'GROUP') {
      if (!values.groupId) throw new ApiError(400, 'Group subjects require a groupId', 'GROUP_REQUIRED');
      const group = await requireActive('groups', values.groupId);
      if (group.courseId.toString() !== values.courseId.toString()) {
        throw new ApiError(400, 'Group does not belong to the specified course', 'INVALID_PARENT_RELATIONSHIP');
      }
    }
    return;
  }

  let subject;
  if (['books', 'chapters', 'videos', 'pdfs'].includes(resource)) {
    await requireActive('courses', values.courseId);
    subject = await requireActive('subjects', values.subjectId);
    if (
      subject.courseId.toString() !== values.courseId.toString() ||
      (subject.groupId?.toString() || null) !== (values.groupId?.toString() || null)
    ) {
      throw new ApiError(400, 'Subject does not belong to the specified course and group', 'INVALID_PARENT_RELATIONSHIP');
    }
  }

  if (['chapters', 'videos', 'pdfs'].includes(resource)) {
    const book = await requireActive('books', values.bookId);
    if (
      book.courseId.toString() !== values.courseId.toString() ||
      (book.groupId?.toString() || null) !== (values.groupId?.toString() || null) ||
      book.subjectId.toString() !== values.subjectId.toString()
    ) {
      throw new ApiError(400, 'Book does not belong to the specified academic hierarchy', 'INVALID_PARENT_RELATIONSHIP');
    }
  }

  if (['videos', 'pdfs'].includes(resource)) {
    const chapter = await requireActive('chapters', values.chapterId);
    if (
      chapter.courseId.toString() !== values.courseId.toString() ||
      (chapter.groupId?.toString() || null) !== (values.groupId?.toString() || null) ||
      chapter.subjectId.toString() !== values.subjectId.toString() ||
      chapter.bookId.toString() !== values.bookId.toString()
    ) {
      throw new ApiError(400, 'Chapter does not belong to the specified academic hierarchy', 'INVALID_PARENT_RELATIONSHIP');
    }

    const asset = await repository.findById('mediaAssets', values.mediaAssetId);
    const expectedType = resource === 'videos' ? 'video' : 'raw';
    if (!asset || asset.resourceType !== expectedType) {
      throw new ApiError(400, `A verified ${expectedType} media asset is required`, 'INVALID_MEDIA_ASSET');
    }
  }
}

async function ensureUnique(resource, values, excludeId) {
  const key = keyFor(resource, values);
  if (!key) return;
  const filter = { status: { $ne: 'ARCHIVED' } };
  if (excludeId) filter._id = { $ne: excludeId };
  if (resource === 'courses') {
    filter.titleKey = key;
  } else if (resource === 'groups') {
    filter.courseId = values.courseId;
    filter.titleKey = key;
  } else if (resource === 'subjects') {
    filter.courseId = values.courseId;
    filter.groupId = values.groupId;
    filter.subjectKey = key;
  } else if (resource === 'books') {
    filter.subjectId = values.subjectId;
    filter.titleKey = key;
  } else if (resource === 'chapters') {
    filter.bookId = values.bookId;
    filter.titleKey = key;
  } else {
    return;
  }
  if (await repository.findOne(resource, filter)) {
    throw new ApiError(409, 'A record with the same name already exists in this parent', 'DUPLICATE_RESOURCE');
  }
}

function buildFilter(resource, query) {
  const filter = { status: { $ne: 'ARCHIVED' } };
  if (query.status) {
    const allowed = ['videos', 'pdfs'].includes(resource)
      ? ['DRAFT', 'PUBLISHED', 'ARCHIVED']
      : ['ACTIVE', 'INACTIVE', 'ARCHIVED'];
    if (!allowed.includes(query.status)) throw new ApiError(400, 'Invalid status filter', 'INVALID_FILTER');
    filter.status = query.status;
  }
  for (const field of Object.keys(query)) {
    if (['page', 'limit', 'search', 'status', 'sortBy', 'sortOrder'].includes(field)) continue;
    filter[field] = query[field];
  }
  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchFields = resource === 'subjects'
      ? ['title', 'subjectName']
      : resource === 'books'
        ? ['title', 'author']
        : ['title'];
    filter.$or = searchFields.map((field) => ({ [field]: { $regex: escaped, $options: 'i' } }));
  }
  return filter;
}

async function create(resource, input) {
  const values = editableValues(resource, input);
  await validateParents(resource, values);
  await ensureUnique(resource, values);
  try {
    const created = await repository.create(resource, values);
    return repository.getByIdWithCounts(resource, created.toObject());
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'A record with the same name already exists in this parent', 'DUPLICATE_RESOURCE');
    }
    throw error;
  }
}

async function getOne(resource, id) {
  const document = await repository.findById(resource, id);
  if (!document) throw new ApiError(404, 'Record not found', 'RESOURCE_NOT_FOUND');
  return repository.getByIdWithCounts(resource, document);
}

async function list(resource, query) {
  const filter = buildFilter(resource, query);
  const result = await repository.list(resource, filter, query);
  const items = await repository.addCounts(resource, result.documents);
  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      pages: Math.ceil(result.total / query.limit),
    },
  };
}

async function update(resource, id, input) {
  const current = await repository.findById(resource, id);
  if (!current) throw new ApiError(404, 'Record not found', 'RESOURCE_NOT_FOUND');
  const values = editableValues(resource, input);
  const merged = { ...current, ...values };
  const protectedChildren = {
    groups: [['subjects', 'groupId']],
    subjects: [['books', 'subjectId']],
    books: [['chapters', 'bookId']],
    chapters: [['videos', 'chapterId'], ['pdfs', 'chapterId']],
  }[resource] || [];
  const parentFieldsForResource = {
    groups: ['courseId'],
    subjects: ['courseId', 'groupId', 'subjectType'],
    books: ['courseId', 'groupId', 'subjectId'],
    chapters: ['courseId', 'groupId', 'subjectId', 'bookId'],
  }[resource] || [];
  const changesParent = parentFieldsForResource.some(
    (field) =>
      Object.hasOwn(values, field) &&
      (current[field]?.toString() || null) !== (values[field]?.toString() || null),
  );
  if (changesParent) {
    for (const [childResource, field] of protectedChildren) {
      if (await repository.modelFor(childResource).exists({ [field]: current._id, status: { $ne: 'ARCHIVED' } })) {
        throw new ApiError(409, 'Archive or move active child records before changing parent relationships', 'ACTIVE_CHILD_RECORDS');
      }
    }
  }
  await validateParents(resource, merged);
  await ensureUnique(resource, merged, id);
  try {
    const updated = await repository.update(resource, id, values);
    return repository.getByIdWithCounts(resource, updated.toObject ? updated.toObject() : updated);
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'A record with the same name already exists in this parent', 'DUPLICATE_RESOURCE');
    }
    throw error;
  }
}

async function archive(resource, id) {
  const document = await repository.findById(resource, id);
  if (!document) throw new ApiError(404, 'Record not found', 'RESOURCE_NOT_FOUND');

  const childRelations = {
    courses: [['groups', 'courseId'], ['subjects', 'courseId']],
    groups: [['subjects', 'groupId']],
    subjects: [['books', 'subjectId']],
    books: [['chapters', 'bookId']],
    chapters: [['videos', 'chapterId'], ['pdfs', 'chapterId']],
  }[resource] || [];
  for (const [childResource, field] of childRelations) {
    if (await repository.modelFor(childResource).exists({ [field]: document._id, status: { $ne: 'ARCHIVED' } })) {
      throw new ApiError(409, 'Archive or move active child records before archiving this record', 'ACTIVE_CHILD_RECORDS');
    }
  }
  const updated = await repository.update(resource, id, { status: 'ARCHIVED' });
  return repository.getByIdWithCounts(resource, updated);
}

function ensureValidId(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid MongoDB ID', 'INVALID_ID');
}

module.exports = { create, getOne, list, update, archive, ensureValidId };
