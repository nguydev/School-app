const repository = require('../academic/repository');
const resource = 'groups';

module.exports = {
  findById: (id) => repository.findById(resource, id),
  list: (filter, options) => repository.list(resource, filter, options),
  create: (values) => repository.create(resource, values),
  update: (id, values) => repository.update(resource, id, values),
  addCounts: (items) => repository.addCounts(resource, items),
};
