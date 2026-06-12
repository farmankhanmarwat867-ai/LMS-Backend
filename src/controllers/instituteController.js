const Institute = require('../models/Institute');

// @desc    Create a new institute
// @route   POST /api/institutes
// @access  Private (SUPER_ADMIN)
exports.createInstitute = async (req, res, next) => {
  try {
    const { name, email, phone, address, city, country, website, logo } = req.body;

    const institute = await Institute.create({
      name,
      email,
      phone,
      address,
      city,
      country,
      website,
      logo,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: institute });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all institutes
// @route   GET /api/institutes
// @access  Private (SUPER_ADMIN)
exports.getAllInstitutes = async (req, res, next) => {
  try {
    const institutes = await Institute.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: institutes.length,
      data: institutes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single institute
// @route   GET /api/institutes/:id
// @access  Private (SUPER_ADMIN)
exports.getInstitute = async (req, res, next) => {
  try {
    const institute = await Institute.findById(req.params.id).populate(
      'createdBy',
      'name email'
    );

    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }

    res.status(200).json({ success: true, data: institute });
  } catch (error) {
    next(error);
  }
};

// @desc    Update institute
// @route   PUT /api/institutes/:id
// @access  Private (SUPER_ADMIN)
exports.updateInstitute = async (req, res, next) => {
  try {
    const institute = await Institute.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }

    res.status(200).json({ success: true, data: institute });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete institute
// @route   DELETE /api/institutes/:id
// @access  Private (SUPER_ADMIN)
exports.deleteInstitute = async (req, res, next) => {
  try {
    const institute = await Institute.findByIdAndDelete(req.params.id);

    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }

    res.status(200).json({ success: true, message: 'Institute deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle institute active status
// @route   PATCH /api/institutes/:id/toggle
// @access  Private (SUPER_ADMIN)
exports.toggleStatus = async (req, res, next) => {
  try {
    const institute = await Institute.findById(req.params.id);

    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }

    institute.isActive = !institute.isActive;
    await institute.save();

    res.status(200).json({
      success: true,
      message: `Institute ${institute.isActive ? 'activated' : 'deactivated'} successfully`,
      data: institute,
    });
  } catch (error) {
    next(error);
  }
};
