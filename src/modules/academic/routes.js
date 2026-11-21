const express = require('express');

const router = express.Router();
router.use('/courses', require('../courses/course.route'));
router.use('/groups', require('../groups/group.route'));
router.use('/subjects', require('../subjects/subject.route'));
router.use('/books', require('../books/book.route'));
router.use('/chapters', require('../chapters/chapter.route'));
router.use('/videos', require('../videos/video.route'));
router.use('/pdfs', require('../pdfs/pdf.route'));

module.exports = router;
