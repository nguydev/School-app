const service = require('../academic/service');

module.exports = {
  create: (input) => service.create('groups', input),
  getOne: (id) => service.getOne('groups', id),
  list: (query) => service.list('groups', query),
  update: (id, input) => service.update('groups', id, input),
  archive: (id) => service.archive('groups', id),
};
