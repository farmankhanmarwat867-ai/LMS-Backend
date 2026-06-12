const BaseRepository = require('./base.repository');
const Branch = require('../models/Branch');

class BranchRepository extends BaseRepository {
  constructor() {
    super(Branch);
  }

  async findByCode(code) {
    return Branch.findOne({ code });
  }

  async findByEmail(email) {
    return Branch.findOne({ email });
  }

  async countByInstituteId(instituteId) {
    return Branch.countDocuments({ instituteId, isDeleted: { $ne: true } });
  }
}

module.exports = new BranchRepository();
