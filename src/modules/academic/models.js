const mongoose = require('mongoose');

const { Schema } = mongoose;
const objectId = { type: Schema.Types.ObjectId };
const status = (values) => ({ type: String, enum: values, default: values[0], required: true });

const courseSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  titleKey: { type: String, required: true, select: false },
  description: { type: String, trim: true, maxlength: 4000, default: '' },
  image: { type: String, trim: true, maxlength: 2048, default: '' },
  coreSubjects: { type: [objectId], ref: 'Subject', default: [] },
  videoCount: { type: Number, default: 0 },
  pdfCount: { type: Number, default: 0 },
  status: status(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
  order: { type: Number, min: 0, max: 1000000, default: 0 },
}, { timestamps: true, versionKey: false });
courseSchema.index({ titleKey: 1 }, { unique: true });
courseSchema.index({ status: 1, order: 1, title: 1 });

const groupSchema = new Schema({
  courseId: { ...objectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  titleKey: { type: String, required: true, select: false },
  description: { type: String, trim: true, maxlength: 4000, default: '' },
  image: { type: String, trim: true, maxlength: 2048, default: '' },
  videoCount: { type: Number, default: 0 },
  pdfCount: { type: Number, default: 0 },
  status: status(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
  order: { type: Number, min: 0, max: 1000000, default: 0 },
}, { timestamps: true, versionKey: false });
groupSchema.index({ courseId: 1, titleKey: 1 }, { unique: true });
groupSchema.index({ courseId: 1, status: 1, order: 1 });

const subjectSchema = new Schema({
  courseId: { ...objectId, ref: 'Course', required: true },
  groupId: { ...objectId, ref: 'Group', default: null },
  subjectName: { type: String, required: true, trim: true, maxlength: 120 },
  subjectKey: { type: String, required: true, select: false },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 4000, default: '' },
  image: { type: String, trim: true, maxlength: 2048, default: '' },
  subjectType: { type: String, enum: ['GROUP', 'COMMON'], required: true },
  chapters: { type: Number, default: 0 },
  chapterCount: { type: Number, default: 0 },
  videoCount: { type: Number, default: 0 },
  pdfCount: { type: Number, default: 0 },
  status: status(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
  order: { type: Number, min: 0, max: 1000000, default: 0 },
}, { timestamps: true, versionKey: false });
subjectSchema.index({ courseId: 1, groupId: 1, subjectKey: 1 }, { unique: true });
subjectSchema.index({ courseId: 1, groupId: 1, status: 1, order: 1 });

const bookSchema = new Schema({
  courseId: { ...objectId, ref: 'Course', required: true },
  groupId: { ...objectId, ref: 'Group', default: null },
  subjectId: { ...objectId, ref: 'Subject', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  titleKey: { type: String, required: true, select: false },
  description: { type: String, trim: true, maxlength: 4000, default: '' },
  image: { type: String, trim: true, maxlength: 2048, default: '' },
  author: { type: String, required: true, trim: true, maxlength: 160 },
  publicationYear: { type: Number, required: true, min: 1000, max: 3000 },
  chapterCount: { type: Number, default: 0 },
  videoCount: { type: Number, default: 0 },
  pdfCount: { type: Number, default: 0 },
  status: status(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
  order: { type: Number, min: 0, max: 1000000, default: 0 },
}, { timestamps: true, versionKey: false });
bookSchema.index({ subjectId: 1, titleKey: 1 }, { unique: true });
bookSchema.index({ courseId: 1, groupId: 1, subjectId: 1, status: 1, order: 1 });

const chapterSchema = new Schema({
  courseId: { ...objectId, ref: 'Course', required: true },
  groupId: { ...objectId, ref: 'Group', default: null },
  subjectId: { ...objectId, ref: 'Subject', required: true },
  bookId: { ...objectId, ref: 'Book', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  titleKey: { type: String, required: true, select: false },
  description: { type: String, trim: true, maxlength: 4000, default: '' },
  videoCount: { type: Number, default: 0 },
  pdfCount: { type: Number, default: 0 },
  status: status(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
  order: { type: Number, min: 0, max: 1000000, default: 0 },
}, { timestamps: true, versionKey: false });
chapterSchema.index({ bookId: 1, titleKey: 1 }, { unique: true });
chapterSchema.index({ courseId: 1, groupId: 1, subjectId: 1, bookId: 1, status: 1, order: 1 });

const videoSchema = new Schema({
  schoolId: { type: String, trim: true, maxlength: 128, default: null },
  courseId: { ...objectId, ref: 'Course', required: true },
  groupId: { ...objectId, ref: 'Group', default: null },
  subjectId: { ...objectId, ref: 'Subject', required: true },
  bookId: { ...objectId, ref: 'Book', required: true },
  chapterId: { ...objectId, ref: 'Chapter', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 4000, default: '' },
  mediaAssetId: { ...objectId, ref: 'MediaAsset', required: true },
  duration: { type: Number, required: true, min: 1, max: 86400 },
  thumbnail: { type: String, trim: true, maxlength: 2048, default: '' },
  status: status(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  order: { type: Number, min: 0, max: 1000000, default: 0 },
}, { timestamps: true, versionKey: false });
videoSchema.index({ chapterId: 1, status: 1, order: 1 });
videoSchema.index({ courseId: 1, groupId: 1, subjectId: 1, bookId: 1 });
videoSchema.index({ mediaAssetId: 1 }, { unique: true });

const pdfSchema = new Schema({
  schoolId: { type: String, trim: true, maxlength: 128, default: null },
  courseId: { ...objectId, ref: 'Course', required: true },
  groupId: { ...objectId, ref: 'Group', default: null },
  subjectId: { ...objectId, ref: 'Subject', required: true },
  bookId: { ...objectId, ref: 'Book', required: true },
  chapterId: { ...objectId, ref: 'Chapter', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 4000, default: '' },
  mediaAssetId: { ...objectId, ref: 'MediaAsset', required: true },
  totalPages: { type: Number, required: true, min: 1, max: 100000 },
  fileSize: { type: Number, required: true, min: 1, max: 2147483648 },
  status: status(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  order: { type: Number, min: 0, max: 1000000, default: 0 },
}, { timestamps: true, versionKey: false });
pdfSchema.index({ chapterId: 1, status: 1, order: 1 });
pdfSchema.index({ courseId: 1, groupId: 1, subjectId: 1, bookId: 1 });
pdfSchema.index({ mediaAssetId: 1 }, { unique: true });

const mediaAssetSchema = new Schema({
  provider: { type: String, enum: ['cloudinary'], required: true },
  resourceType: { type: String, enum: ['video', 'raw'], required: true },
  publicId: { type: String, required: true, trim: true, maxlength: 255 },
  secureUrl: { type: String, required: true, trim: true, maxlength: 2048 },
  format: { type: String, required: true, trim: true, maxlength: 32 },
  bytes: { type: Number, required: true, min: 1, max: 2147483648 },
  duration: { type: Number, min: 0, max: 86400 },
}, { timestamps: true, versionKey: false });
mediaAssetSchema.index({ publicId: 1 }, { unique: true });

const models = {
  courses: mongoose.models.Course || mongoose.model('Course', courseSchema),
  groups: mongoose.models.Group || mongoose.model('Group', groupSchema),
  subjects: mongoose.models.Subject || mongoose.model('Subject', subjectSchema),
  books: mongoose.models.Book || mongoose.model('Book', bookSchema),
  chapters: mongoose.models.Chapter || mongoose.model('Chapter', chapterSchema),
  videos: mongoose.models.Video || mongoose.model('Video', videoSchema),
  pdfs: mongoose.models.Pdf || mongoose.model('Pdf', pdfSchema),
  mediaAssets: mongoose.models.MediaAsset || mongoose.model('MediaAsset', mediaAssetSchema),
};

module.exports = models;
