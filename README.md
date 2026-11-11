# Agency Agents cho Paperclip

Bộ chuyển đổi gồm **283 skill thuộc 18 nhóm**, từ [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) tại commit [8ae6164602c95ca78828b148b9052460ee426885](https://github.com/msitarzewski/agency-agents/commit/8ae6164602c95ca78828b148b9052460ee426885). Nội dung chuyên môn giữ tiếng Anh như nguồn gốc.

## Import vào Paperclip

1. Giải nén toàn bộ gói vào một project workspace đã đăng ký trên máy chạy Paperclip. Không chỉ copy riêng các file SKILL.md: cần giữ references và LICENSE.
2. Vào **Skills → New → Import from path or URL**, nhập đường dẫn tới thư mục skills/ của gói; hoặc dùng **Import skills from project** để quét workspace.
3. Chọn các skill cần dùng và gán cho agent sau khi import. Import không tự tạo agent, thiết lập Reports to, cài plugin, kết nối công cụ hay cấp quyền.
4. Thử một task đại diện cho từng vai trò trước khi dùng vào công việc thực tế.

Đường dẫn local phải nằm trong workspace hoặc vùng lưu trữ mà Paperclip cho phép. Nếu Paperclip chạy trên VPS, đường dẫn phải là đường dẫn trên VPS.

Có thể đưa nguyên thư mục gói lên một repository GitHub rồi import URL repository hoặc thư mục skill tương ứng. paperclip.skills.json khai báo các entrypoint theo định dạng manifest được tài liệu Paperclip mô tả.

CLI tương đương:

```sh
paperclipai skills import /path/to/agency-agents-paperclip/skills --company-id YOUR_COMPANY_ID
```

## Cấu trúc

```text
skills/<nhóm>/agency-<tên-gốc>/
  SKILL.md
  LICENSE
  references/upstream/<đường-dẫn-vai-trò-gốc>.md
```

SKILL.md có name dạng kebab-case, description để định tuyến, giấy phép và metadata nguồn. File tham chiếu giữ nguyên từng byte của vai trò gốc. Các tài nguyên được liên kết tương đối và tồn tại trong nguồn sẽ được đóng gói kèm, giữ đường dẫn tương đối. Các liên kết gốc không giải được được ghi trong conversion-report.json.

## Những gì đã thay đổi

- Chuyển từng định nghĩa vai trò thành một skill riêng có tiền tố agency- để giảm trùng tên.
- Thêm mô tả dùng khi task cần chuyên môn tương ứng.
- Giữ phần hướng dẫn dài trong references để chỉ nạp khi dùng.
- Thêm hướng dẫn áp dụng vai trò trong phạm vi agent/task hiện có; không coi lời mô tả memory hoặc kinh nghiệm trong persona là dữ kiện thực tế.
- Giữ giấy phép MIT ở cấp gói và từng skill để hỗ trợ import riêng lẻ.
- Không chạy script hay lệnh cài đặt từ upstream. Thuộc tính tools/services ở frontmatter gốc được giữ trong tham chiếu, không tự chuyển thành quyền thực thi.

## Tra cứu và giới hạn

- [Danh mục đọc nhanh](CATALOG.md); catalog.json có mô tả, nguồn và SHA-256 của từng file gốc.
- conversion-report.json ghi cảnh báo nguồn; validation-report.json ghi kết quả kiểm tra cấu trúc và toàn vẹn.
- Đây là chuyển đổi định dạng và đóng gói, không phải đánh giá chất lượng nghiệp vụ của 283 vai trò, và chưa import thử vào một instance Paperclip đang chạy.
- Các agent có chức năng tự spawn/delegate trong nội dung nguồn vẫn cần runtime và quyền tương ứng; chúng không tự trở thành nhân viên Paperclip.
- Chọn một số skill sát vai trò mỗi agent thay vì gán toàn bộ bộ sưu tập.

## Chạy lại bộ chuyển đổi

Yêu cầu Node.js có các module chuẩn; không cần npm install. Từ một checkout/snapshot Agency Agents:

```sh
node tools/convert-agency-agents.mjs /path/to/agency-agents /path/to/new-empty-output 8ae6164602c95ca78828b148b9052460ee426885 /path/to/output.zip
```

Thư mục đầu ra phải trống. Script không sửa nguồn và không ghi đè một gói đã tồn tại. Khi cập nhật nguồn, truyền SHA đúng của commit tương ứng và xem lại LICENSE trước khi phân phối.

## Nguồn định dạng

- [Paperclip Skills Reference](https://docs.paperclip.ing/reference/skills/)
- [Paperclip Skills guide](https://docs.paperclip.ing/guides/org/skills/)
- [Agency Agents upstream](https://github.com/msitarzewski/agency-agents)
