# Rà soát cấu trúc và giao diện

## Hiện trạng trước khi sửa

| File | Số dòng | Trách nhiệm |
| --- | ---: | --- |
| `frontend/index.html` | 1.079 | HTML, CSS, state, render, API, đăng nhập, history, voice, upload |
| `src/api/api_server.py` | 521 | Khởi tạo app, cấu hình, schemas, OAuth, lưu JSON, toàn bộ endpoint |
| `src/pipeline/retriever.py` | 495 | Vector store và retrieval |
| `src/models/llm_generator.py` | 381 | Prompt, generation, embeddings và web search |
| `src/data/parser.py` | 228 | PDF parsing và chunking |

Vấn đề chính là nhiều trách nhiệm cùng thay đổi trong một file và state toàn cục ngầm định.
Số dòng là tín hiệu để xem xét; không cần chia mọi file thành nhiều lớp chỉ để giảm số dòng.

## Cấu trúc sau refactor

- `frontend/index.html`: khung HTML; dùng CSS ngoài và một entrypoint ES module.
- `assets/js/app.js`: đăng ký sự kiện và khởi động. Không dùng inline `onclick`.
- `api.js`: request cùng origin, xử lý status và lỗi thống nhất.
- `state.js`: trạng thái chia sẻ rõ ràng; `render.js` chỉ dựng giao diện từ trạng thái.
- `auth.js`, `sessions.js`, `workspaces.js`, `chat.js`, `documents.js`, `voice.js`: mỗi module phụ trách một nhóm thao tác.
- CSS chia theo nền tảng và component; `responsive.css` chứa breakpoint và drawer.
- `src/api/api_server.py`: ghép app, middleware, router và static assets.
- `routers/`: tách theo auth, history, workspace, document và chat.
- `schemas.py`: hợp đồng request/response; `history_store.py`: đường dẫn lưu theo user.
- `config.py`: nạp `.env` trước OAuth; static path không phụ thuộc thư mục chạy lệnh.

Giữ các URL API, lệnh khởi động và chữ ký public của parser/retriever/generator.
Frontend và API được phục vụ cùng origin; không cần CORS wildcard hay địa chỉ localhost viết cứng.
History bổ sung `web_results` và `is_web` với giá trị mặc định để dữ liệu cũ vẫn đọc được.

## Những lỗi đã xử lý

- Bố cục ba cột cố định: thu thành drawer trên tablet/mobile, chat giữ đủ chiều rộng.
- Chữ nhỏ, tương phản yếu, bong bóng bị giới hạn chiều rộng hai lần: chỉnh lại typography, khoảng cách và chiều rộng nội dung.
- Tóm tắt lấy tên file từ text chứa icon: đọc filename gốc từ state.
- Mã HTTP `44` khi không tìm được tài liệu: sửa thành `404`.
- Response của mô hình được chèn trực tiếp vào HTML: escape trước khi định dạng Markdown đơn giản; chỉ mở nguồn web HTTP/HTTPS.
- Gửi câu hỏi trùng hoặc đổi hội thoại trong lúc sinh câu trả lời: khóa luồng từ tạo session đến lưu kết quả.
- Upload nhiều file khi đổi workspace: giữ workspace đích trong suốt batch.
- Xóa workspace thất bại nhưng UI vẫn xóa trạng thái: chỉ cập nhật sau response thành công.
- Chat đầu tiên không tự lưu dù đã đăng nhập: tạo session trước khi gửi.
- Tải tất cả danh sách file ngay khi mở trang: chỉ tải khi chọn workspace.
- Các đường dẫn lịch sử chứa ký tự phân cách thư mục: từ chối trước khi truy cập file.

## Các mục còn cần xử lý riêng

1. **Quyền sở hữu workspace**: các endpoint workspace/chat/upload hiện chưa lọc theo user; OAuth mới bảo vệ lịch sử chat. Muốn triển khai nhiều user cần quyết định workspace riêng/chia sẻ và áp dụng quyền truy cập xuyên suốt retrieval.
2. **Tác vụ chặn trong async endpoint**: parsing PDF, truy vấn vector và một số lệnh Gemini đồng bộ vẫn chạy trong handler async. Nên đưa sang thread pool hoặc job queue khi xử lý tải thực tế.
3. **Lịch sử JSON**: chưa có transaction/khóa ghi giữa nhiều request hoặc process. Khi triển khai nhiều worker nên chuyển sang SQLite/PostgreSQL với repository riêng.
4. **Upload**: chưa giới hạn dung lượng và chưa kiểm tra đầy đủ định dạng nội dung PDF ở backend. Cần bổ sung theo giới hạn vận hành thực tế.
5. **Cấu hình triển khai**: session secret vẫn có giá trị mặc định dành cho local; production cần secret riêng và chính sách cookie phù hợp HTTPS.

Các mục trên đã tồn tại trước refactor và chưa được xử lý toàn bộ trong thay đổi về cấu trúc/giao diện này.

## Kiểm chứng

- API: kiểm tra hợp đồng đường dẫn, phục vụ static assets, quyền truy cập history, CRUD history với nguồn web, filename chính xác và 404 của summary.
- Frontend: kiểm tra escape HTML, URL an toàn, lỗi HTTP, chống gửi trùng, filename summary, lưu metadata web, lỗi xóa workspace và upload qua thay đổi workspace.
- Trình duyệt: xem bố cục desktop và viewport 390 × 844; mở drawer workspace/tài liệu, xác nhận không tràn ngang.
- Chưa chạy end-to-end với OAuth Google, ChromaDB, PDF thật và Gemini. Môi trường kiểm thử chỉ cài dependency phục vụ API, chưa có toàn bộ dependency AI/PDF.
