const Announcement = require('../models/Announcement');

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private (INSTITUTE_ADMIN, TEACHER)
exports.createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, targetRole } = req.body;
    const announcement = await Announcement.create({
      title, content,
      targetRole: targetRole || 'ALL',
      instituteId: req.user.instituteId,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: announcement });
  } catch (error) { next(error); }
};

// @desc    Get announcements
// @route   GET /api/announcements
// @access  Private (All)
exports.getAnnouncements = async (req, res, next) => {
  try {
    let query = { instituteId: req.user.instituteId };
    if (req.user.role === 'STUDENT') {
      query.targetRole = { $in: ['ALL', 'STUDENT'] };
    } else if (req.user.role === 'TEACHER') {
      query.targetRole = { $in: ['ALL', 'TEACHER'] };
    }

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: announcements.length, data: announcements });
  } catch (error) { next(error); }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Creator only)
exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    if (announcement.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Not authorized to delete this announcement' });
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) { next(error); }
};
