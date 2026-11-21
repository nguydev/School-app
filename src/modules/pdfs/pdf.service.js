const service = require('../academic/service');

module.exports = {
  create: (input) => service.create('pdfs', input),
  getOne: (id) => service.getOne('pdfs', id),
  list: (query) => service.list('pdfs', query),
  update: (id, input) => service.update('pdfs', id, input),
  archive: (id) => service.archive('pdfs', id),
};
