const models = require('./models');

const counts = {
  courses: { videos: ['videos', 'courseId', 'videoCount'], pdfs: ['pdfs', 'courseId', 'pdfCount'] },
  groups: { videos: ['videos', 'groupId', 'videoCount'], pdfs: ['pdfs', 'groupId', 'pdfCount'] },
  subjects: {
    chapters: ['chapters', 'subjectId', 'chapters'],
    videos: ['videos', 'subjectId', 'videoCount'],
    pdfs: ['pdfs', 'subjectId', 'pdfCount'],
  },
  books: {
    chapters: ['chapters', 'bookId', 'chapterCount'],
    videos: ['videos', 'bookId', 'videoCount'],
    pdfs: ['pdfs', 'bookId', 'pdfCount'],
  },
  chapters: {
    videos: ['videos', 'chapterId', 'videoCount'],
    pdfs: ['pdfs', 'chapterId', 'pdfCount'],
  },
};

async function findById(resource, id) {
  return models[resource].findById(id).lean();
}

async function findOne(resource, filter) {
  return models[resource].findOne(filter).lean();
}

async function create(resource, values) {
  return models[resource].create(values);
}

async function update(resource, id, values) {
  return models[resource].findByIdAndUpdate(
    id,
    { $set: values },
    { new: true, runValidators: true, context: 'query' },
  ).lean();
}

async function list(resource, filter, { page, limit, sortBy, sortOrder }) {
  const model = models[resource];
  const direction = sortOrder === 'desc' ? -1 : 1;
  const sort = { [sortBy]: direction, _id: 1 };
  const [documents, total] = await Promise.all([
    model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    model.countDocuments(filter),
  ]);
  return { documents, total };
}

async function addCounts(resource, documents) {
  const definitions = counts[resource];
  if (!definitions || documents.length === 0) return documents;

  const ids = documents.map((document) => document._id);
  const results = await Promise.all(Object.entries(definitions).map(async ([name, [modelKey, foreignKey]]) => {
    const grouped = await models[modelKey].aggregate([
      { $match: { [foreignKey]: { $in: ids }, status: { $ne: 'ARCHIVED' } } },
      { $group: { _id: `$${foreignKey}`, count: { $sum: 1 } } },
    ]);
    return [name, new Map(grouped.map((item) => [item._id.toString(), item.count]))];
  }));
  const byType = new Map(results);

  for (const document of documents) {
    for (const [name, [, , outputKey]] of Object.entries(definitions)) {
      document[outputKey] = byType.get(name).get(document._id.toString()) || 0;
    }
    if (resource === 'subjects') document.chapterCount = document.chapters;
  }
  return documents;
}

async function getByIdWithCounts(resource, document) {
  const [result] = await addCounts(resource, [document]);
  return result;
}

module.exports = {
  findById,
  findOne,
  create,
  update,
  list,
  addCounts,
  getByIdWithCounts,
  modelFor: (resource) => models[resource],
};
