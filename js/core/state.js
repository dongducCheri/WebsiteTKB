const STORAGE_KEY_ROWS = 'TKB_ROWS';
const STORAGE_KEY_META = 'TKB_META';
const STORAGE_KEY_SELECTED = 'TKB_SELECTED';
const STORAGE_KEY_COURSES = 'TKB_COURSES';

const state = {
  rows:            null,
  courseMap:       null,
  stats:           null,
  selectedCourses: new Set(),
  timetableCourses: new Set(), // Học phần đang có trên lưới TKB (đã chọn ít nhất 1 loại lớp hoặc đang chọn)
  editingCourse: null,         // Học phần đang mở chế độ chọn thêm lớp (hiện block pending)
  timetableRowHeight: 60,      // Default height for the grid rows in pixels (60px works best for 6 kíp layout)
  selectedClasses: {},
  timetableBlockOrder: [],     // Thứ tự xác nhận lớp trên TKB — lớp chọn sau nằm trên khi trùng giờ
  timetableBlockShift: {}      // Dịch ngang thủ công từng thẻ (bước × BLOCK_SHIFT_STEP_PX)
};
