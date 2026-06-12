const BaseRepository = require('./base.repository');
const Institute = require('../models/Institute');

class InstituteRepository extends BaseRepository {
  constructor() {
    super(Institute);
  }

  async findByCode(code) {
    return Institute.findOne({ code });
  }

  async findByEmail(email) {
    return Institute.findOne({ email });
  }
}

module.exports = new InstituteRepository();
