# Project: Website Xếp Thời Khóa Biểu HUST

## Mục tiêu
Website thuần HTML + JavaScript giúp sinh viên HUST xếp thời khóa biểu.
Không cần backend, chạy hoàn toàn trên trình duyệt.

## Stack
- Thuần HTML + CSS + Vanilla JavaScript
- SheetJS để đọc file Excel .xlsx trong browser
- localStorage để lưu TKB
- Claude API để AI gợi ý xếp lịch

## Dữ liệu
- File Excel: TKB20252-FULL.xlsx (13.638 dòng, 25 cột)
- Đã có schema.sql, import_excel.py, db_query.py, tkb.db (SQLite ~4MB)
- Cột quan trọng: Mã_HP, Tên_HP, Mã_lớp, Thứ, Thời_gian, Kíp, Tuần, Phòng, Loại_lớp, Mã_QL, Trạng_thái
- Header Excel: 2 dòng rác, dòng 3 mới là header thật
- Thứ: '2'-'7', '8'=CN. Kíp: Sáng/Chiều/Tối
- Tuần dạng: '25-32,34-42' hoặc '29,35,37'
- Loại lớp: LT, BT, TN, LT+BT, TH, ĐA, ĐATN...
- Chương trình (Mã_QL): CT CHUẨN, ELITECH, VLVH, KSCSDT, SIE

## Các module cần xây dựng
1. Upload file Excel → parse bằng SheetJS → lưu vào JS object
2. Tìm kiếm học phần theo Mã_HP (có autocomplete)
3. Timetable UI dạng lưới Thứ × Khung giờ
4. Click chọn lớp vào timetable (KHÔNG cần check conflict, người dùng tự xử lý)
5. Lưu TKB vào localStorage, load lại khi vào trang
6. AI Agent: gọi Claude API, người dùng nhập ràng buộc → AI gợi ý xếp lịch
7. Xuất kết quả: file .txt (copy mã lớp) hoặc .xlsx

## Lưu ý quan trọng
- Không check conflict tự động
- Hỗ trợ nhiều phương án TKB (A, B...)
- Một Mã_HP có thể có nhiều Loại_lớp (LT+BT+TN) → phải chọn đủ
