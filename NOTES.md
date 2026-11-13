# Nightlife.vn - Ghi chú chức năng theo role

> Cập nhật: 11/11/2026 · Commit mới nhất: `dab0cb2`
> Quy mô: 24 trang người dùng · 18 trang admin · 102 API route
> 🆕 = chức năng làm trong đợt này

Role trong hệ thống: `user`, `admin`, `venue_owner`.
**`venue_owner` chưa có chức năng riêng** (không có route nào kiểm tra role này) - hiện tại hoạt động như `user`.

---

## 👤 Khách (chưa đăng nhập)

| Nhóm | Chức năng |
|---|---|
| Tài khoản | Đăng ký, đăng nhập email/mật khẩu, đăng nhập Google |
| Tìm venue | Danh sách, lọc theo loại hình và thành phố, sắp xếp (mới nhất / đánh giá cao / phổ biến), phân trang |
| | 🆕 **Gần tôi**: lấy vị trí trình duyệt (GPS trên điện thoại, Wi-Fi/IP trên máy tính); xếp venue từ gần đến xa, nhãn "Cách 1,2 km"; chọn bán kính 1/3/5/10 km; cảnh báo khi vị trí máy tính kém chính xác; 9 khu vực dự phòng; link chỉ đường. Miễn phí, không cần API key |
| Chi tiết venue | Thông tin, ảnh, giờ mở cửa, bàn, deal, sự kiện sắp tới, review, thảo luận forum |
| | 🆕 **Bản đồ có ghim vị trí** + nút **Mở Google Maps** + **Chỉ đường** (link công khai, miễn phí) |
| | 🆕 **Mức giá hiển thị bằng tiền**: "200.000 – 500.000đ/người" thay cho `$$` |
| Sự kiện | Danh sách, chi tiết, các hạng vé |
| Khác | Happy hour; bar tour (🆕 lọc giá theo tiền); blog/SEO; xem forum; xem gói membership; xem squad qua mã mời; trang liên hệ; 3 ngôn ngữ Việt/Anh/Trung; giao diện sáng/tối |

## 🙋 User (đã đăng nhập) - thêm vào những gì Khách có

| Nhóm | Chức năng |
|---|---|
| Hồ sơ | Sửa thông tin, ảnh đại diện, đăng xuất |
| Đặt bàn | Chọn ngày, giờ, bàn, số khách; cọc bằng tiền mặt, MoMo/VNPay (mock) hoặc 🆕 **chuyển khoản QR**; xem và hủy booking (trước giờ đặt hơn 2 giờ); thành viên trả phí được đặt bàn sớm hơn |
| Vé sự kiện | Mua vé bằng MoMo/VNPay (mock) hoặc 🆕 **chuyển khoản QR** (giữ vé 15 phút); xem vé kèm mã QR check-in |
| Membership | Đăng ký Night Pass / Black Card bằng MoMo/VNPay (mock) hoặc 🆕 **chuyển khoản QR**; xem gói; hủy tự động gia hạn |
| 🆕 Chuyển khoản QR | Trang `/chuyen-khoan`: mã VietQR điền sẵn số tiền và nội dung; nút copy; đếm ngược giữ vé; nút **"Tôi đã chuyển khoản"**; theo dõi trạng thái chờ đối soát / đã xác nhận / đã hủy |
| Passport | Xem điểm, lịch sử, các lần check-in; đổi thưởng. Điểm cộng khi 🆕 **check-in tại venue** (trước đây cộng nhầm lúc hủy booking), viết review, mua vé |
| Review | Viết review kèm ảnh cho booking đã xác minh |
| Forum | Đăng bài, trả lời, báo cáo vi phạm |
| Squad | Tạo, tham gia, xác nhận, chia hóa đơn, đánh dấu đã trả - ⚠️ **chỉ có API, chưa có giao diện** |
| Thông báo | Push qua Firebase, chọn loại thông báo muốn nhận, gửi thử push |

## 🛠️ Admin - thêm vào những gì User có

| Menu | Chức năng |
|---|---|
| Dashboard | Trang tổng quan |
| Venues | Tạo/sửa/xóa venue; quản lý ảnh, bàn, deal, sự kiện |
| | 🆕 **Ghim vị trí**: dán tọa độ hoặc link Google Maps (đọc được cả độ-phút-giây và link địa điểm); bản đồ xem trước; cảnh báo tọa độ ngoài Việt Nam; bỏ tọa độ mặc định ở Quận 1 |
| | 🆕 Dropdown mức giá hiển thị bằng tiền |
| Đặt bàn | Xem/lọc, xác nhận, check-in (🆕 lúc này mới cộng điểm Passport), hoàn tất |
| Vé sự kiện / Check-in vé | Quản lý hạng vé, xác nhận đơn để phát hành vé, check-in vé bằng mã |
| 🆕 Chuyển khoản | **Hàng đợi đối soát** gộp đặt bàn, vé và membership (đơn khách đã báo chuyển xếp lên đầu); nút **Đã nhận tiền** / **Không thấy**; **quản lý tài khoản nhận tiền** (21 ngân hàng, mỗi lúc một tài khoản đang dùng); email báo admin khi khách báo chuyển |
| Membership | Xác nhận / từ chối đăng ký gói |
| Passport | Xem toàn bộ giao dịch điểm |
| Bài viết SEO | Soạn Markdown, tải ảnh, chọn bài liên quan |
| Forum / Báo cáo | Kiểm duyệt bài và phản hồi, xử lý báo cáo |
| Thông báo | Chạy hàng đợi thông báo, gửi nhắc lịch booking, push thử |

## ⚙️ Hệ thống (tự động)

| Chức năng | Ghi chú |
|---|---|
| Cron gửi thông báo theo lịch | QStash, xác thực bằng `CRON_SECRET` |
| IPN thanh toán MoMo/VNPay | Vẫn là mock. 🆕 Đơn chuyển khoản **không thể** bị đánh dấu "đã trả" qua IPN |
| Realtime | Trang tự cập nhật khi booking, thành viên squad, vé thay đổi |
| Giới hạn số request API | Theo IP, lưu trên Redis |

---

## 🔒 Bảo mật và sửa lỗi trong đợt này

| Thay đổi | Migration | Trạng thái |
|---|---|---|
| Chặn user tự nâng quyền admin, tự xác nhận booking, tự cộng điểm, tự kích hoạt membership qua Supabase REST; bật RLS cho 9 bảng | `20261111090000_harden_direct_client_access.sql` | ✅ Đã chạy |
| Đổi thưởng Passport chạy nguyên tử (không còn trừ điểm một lần mà nhận nhiều phần thưởng) | `20261111100000_atomic_passport_points.sql` | ✅ Đã chạy |
| Bảng tài khoản nhận tiền, các cột cho chuyển khoản, UNIQUE cho `payment_ref` | `20261111110000_bank_transfer_payments.sql` | ✅ Đã chạy |
| Sửa lỗi tính sai thứ trong tuần khi kiểm tra giờ mở cửa trên server UTC | - | ✅ |
| Hủy booking không còn được cộng điểm check-in | - | ✅ |

---

## ⚠️ Chưa hoàn thiện / còn tồn đọng

### Chức năng dở dang
- Role `venue_owner` chưa có quyền hay giao diện riêng
- Squad chưa có giao diện (link mời `/squad/...` đang 404); "đã trả phần tiền" chưa qua thanh toán thật
- MoMo/VNPay mới là mock
- Đổi thưởng Passport chỉ trừ điểm, chưa phát voucher/membership
- Tour package / tour booking: có bảng nhưng chưa có API/giao diện

### Vòng đời sự kiện (đã đề xuất hướng xử lý, chưa sửa)
1. Vẫn mua được vé cho sự kiện đã diễn ra
2. Tắt sự kiện đã bán vé: khách không được báo, không có quy trình hoàn tiền
3. Danh sách sự kiện hiện cả sự kiện đã qua
4. Venue đã tắt nhưng sự kiện của venue vẫn bán vé
5. Đổi ngày sự kiện: job nhắc lịch vẫn chạy theo giờ cũ, khách không được báo

Điểm cần chốt trước khi sửa: ngừng bán lúc bắt đầu hay kết thúc sự kiện; hủy sự kiện hoàn toàn bộ hay trừ phí 5%; cách hoàn tiền cho đơn chuyển khoản; đổi lịch có cho yêu cầu hoàn tiền không; tắt venue còn sự kiện đã bán vé thì chặn hay tự hủy.

### Lỗ hổng / lỗi logic còn mở
- Open redirect ở `/api/v1/auth/callback?next=//...`
- Chưa giới hạn số lần đăng nhập/đăng ký (giới hạn đã khai báo nhưng chưa dùng)
- Giới hạn request API bị lách bằng header `x-forwarded-for` giả
- Booking `pending` chưa trả cọc giữ bàn vô thời hạn; booking quá ngày không tự đóng
- Một user có thể giữ hết vé sự kiện (không giới hạn giữ chỗ / không rate limit khi mua)
- Đơn vé chờ thanh toán qua cổng mock không bao giờ hết hạn, vé bị khóa mãi
- Membership bỏ dở thanh toán bị kẹt vĩnh viễn (user không tự hủy được, không đăng ký lại được)
- Review được khi booking mới "confirmed" (chưa đến quán) → có thể review rồi hủy booking mà vẫn giữ điểm
- Thông báo đã lên lịch không bị hủy khi booking bị hủy / sự kiện bị tắt hoặc đổi ngày
- Forum, push token, notification preferences vẫn cho user ghi trực tiếp qua Supabase REST
- Xóa hạng vé có vé đang chờ thanh toán → lỗi khóa ngoại; xóa reply có reply con → lỗi 500
- Bảng `users` không liên kết `auth.users` → chưa xóa được tài khoản theo yêu cầu user

### Dữ liệu và vận hành
- Venue `angels-bar-2` (và có thể venue khác) bị ghim ở tọa độ mặc định Quận 1 `10.7769, 106.7009` → bản đồ/chỉ đường sai. Kiểm tra bằng:
  ```sql
  SELECT id, name, address, lat, lng FROM public.venues
  WHERE lat = 10.7769 AND lng = 106.7009 ORDER BY name;
  ```
- README đang công khai mật khẩu tài khoản demo trên repo public → nên đổi mật khẩu thật trong Supabase Auth
- Vercel gói Hobby: repo phải để public mới deploy được commit của thành viên khác → cân nhắc nâng Pro và đưa repo về private
- Mức giá của các venue cũ được chọn theo cảm tính → cần rà lại theo quy ước chi tiêu mới
