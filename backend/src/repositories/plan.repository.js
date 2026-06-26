const BaseRepository = require('./base.repository');
const Plan = require('../models/Plan');

class PlanRepository extends BaseRepository {
  constructor() {
    super(Plan);
  }

  async findByName(name) {
    return Plan.findOne({ name });
  }
}

module.exports = new PlanRepository();
