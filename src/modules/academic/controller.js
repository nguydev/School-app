const ApiError = require('../../utils/ApiError');
const service = require('./service');

function createController(resource) {
  return {
    async list(req, res) {
      const data = await service.list(resource, req.validated.query);
      res.status(200).json({ success: true, data });
    },
    async get(req, res) {
      const data = await service.getOne(resource, req.validated.params.id);
      res.status(200).json({ success: true, data: { item: data } });
    },
    async create(req, res) {
      const data = await service.create(resource, req.validated.body);
      res.status(201).json({ success: true, message: 'Created successfully', data: { item: data } });
    },
    async update(req, res) {
      const data = await service.update(resource, req.validated.params.id, req.validated.body);
      res.status(200).json({ success: true, message: 'Updated successfully', data: { item: data } });
    },
    async archive(req, res) {
      const data = await service.archive(resource, req.validated.params.id);
      res.status(200).json({ success: true, message: 'Archived successfully', data: { item: data } });
    },
    async notFound() {
      throw new ApiError(404, 'Route not found', 'NOT_FOUND');
    },
  };
}

module.exports = createController;
