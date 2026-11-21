const service = require('../academic/service');

module.exports = {
  create: (input) => service.create('courses', input),
  getOne: (id) => service.getOne('courses', id),
  list: (query) => service.list('courses', query),
  update: (id, input) => service.update('courses', id, input),
  archive: (id) => service.archive('courses', id),
};
