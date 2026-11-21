const service = require('../academic/service');

module.exports = {
  create: (input) => service.create('videos', input),
  getOne: (id) => service.getOne('videos', id),
  list: (query) => service.list('videos', query),
  update: (id, input) => service.update('videos', id, input),
  archive: (id) => service.archive('videos', id),
};
