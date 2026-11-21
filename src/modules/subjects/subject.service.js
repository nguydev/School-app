const service = require('../academic/service');

module.exports = {
  create: (input) => service.create('subjects', input),
  getOne: (id) => service.getOne('subjects', id),
  list: (query) => service.list('subjects', query),
  update: (id, input) => service.update('subjects', id, input),
  archive: (id) => service.archive('subjects', id),
};
