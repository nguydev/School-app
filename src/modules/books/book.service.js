const service = require('../academic/service');

module.exports = {
  create: (input) => service.create('books', input),
  getOne: (id) => service.getOne('books', id),
  list: (query) => service.list('books', query),
  update: (id, input) => service.update('books', id, input),
  archive: (id) => service.archive('books', id),
};
