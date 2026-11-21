const models = require('./models');

async function ensureAcademicIndexes() {
  await Promise.all(Object.values(models).map((model) => model.createIndexes()));
}

module.exports = ensureAcademicIndexes;
