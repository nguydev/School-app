const service = require('../academic/service');

module.exports = {
  create: (input) => service.create('chapters', input),
  getOne: (id) => service.getOne('chapters', id),
  list: (query) => service.list('chapters', query),
  update: (id, input) => service.update('chapters', id, input),
  archive: (id) => service.archive('chapters', id),
};
