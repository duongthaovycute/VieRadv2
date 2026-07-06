# VieRad Website Complete

Đây là website riêng cho VieRad: giới thiệu app, tải APK, mô phỏng dữ liệu nhiều trạm, biểu đồ demo, hướng dẫn dùng, changelog và thông tin người phát triển.

## Cấu trúc file

```txt
VieRad_Web_Complete/
├── index.html      # Trang chính
├── style.css       # Toàn bộ giao diện
├── script.js       # Tương tác: chọn trạm, đổi số liệu, biểu đồ, copy link
├── config.js       # File quan trọng nhất để sửa link APK, phiên bản, GitHub, email
├── favicon.png
└── assets/
    └── vierad-icon.png
```

## Cách đổi link tải APK

Mở `config.js`, sửa dòng:

```js
apkUrl: 'LINK_APK_MOI_CUA_BE_VY'
```

Sau đó upload lại toàn bộ folder lên GitHub Pages.

## Cách đổi phiên bản

Trong `config.js`, sửa:

```js
version: '4.0.1',
lastUpdated: 'ngày/tháng/năm',
apkSize: 'xx MB'
```

## Cách up lên GitHub Pages

1. Tạo repo, ví dụ `VieRad-Web`.
2. Upload toàn bộ file trong folder này vào repo.
3. Vào `Settings` → `Pages`.
4. Chọn `Deploy from a branch`.
5. Chọn branch `main`, folder `/root`.
6. Save.
7. Mở link dạng:

```txt
https://duongthaovycute.github.io/VieRad-Web/
```

## Ghi chú

- Web này không dùng Flutter nên nhẹ, dễ sửa và không cần build.
- Không dùng service worker để tránh lỗi cache bản cũ.
- Khi đổi lớn file CSS/JS, có thể đổi `?v=4.0.0` trong `index.html` thành số mới để trình duyệt lấy bản mới.
