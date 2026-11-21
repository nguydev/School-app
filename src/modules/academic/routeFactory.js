const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middlewares/validate');
const controllerFactory = require('./controller');
const { definitions, idParams } = require('./validation');

function createResourceRouter(resource) {
  const definition = definitions[resource];
  if (!definition) throw new Error(`Unknown academic resource: ${resource}`);
  const controller = controllerFactory(resource);
  const router = express.Router();

  router.get('/', validate(definition.list), asyncHandler(controller.list));
  router.post('/', validate(definition.create), asyncHandler(controller.create));
  router.get('/:id', validate(idParams), asyncHandler(controller.get));
  router.patch('/:id', validate(idParams), validate(definition.update), asyncHandler(controller.update));
  router.delete('/:id', validate(idParams), asyncHandler(controller.archive));

  return router;
}

module.exports = createResourceRouter;
