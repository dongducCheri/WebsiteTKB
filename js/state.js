const STORAGE_KEY_ROWS = 'TKB_ROWS';
const STORAGE_KEY_META = 'TKB_META';

const state = {
  rows:            null,
  courseMap:       null,
  stats:           null,
  selectedCourses: new Set(),
  timetableCourses: new Set(), // Courses that are actively showing on the grid
  timetableRowHeight: 60,      // Default height for the grid rows in pixels (60px works best for 6 kíp layout)
  selectedClasses: {}
};
