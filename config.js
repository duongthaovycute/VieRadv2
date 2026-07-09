```js
window.VIERAD_CONFIG = {
  /*
   * CẤU HÌNH CHUNG
   */
  defaultStation: "station_1",
  maxHistoryPoints: 2000,

  thresholds: {
    caution: 0.5,
    warning: 1.0,
    danger: 4.0
  },

  /*
   * CẤU HÌNH RIÊNG CHO TỪNG TRẠM
   *
   * Trạm 1:
   * - latestApiUrl: lấy số liệu mới nhất
   * - historyApiUrl: lấy dữ liệu lịch sử để vẽ biểu đồ
   *
   * Mỗi trạm có refreshSeconds riêng để tránh gọi API
   * quá dày và giúp web chạy ổn định hơn.
   */
  stations: [
    {
      stationId: "station_1",

      stationNameVi: "Trạm 1",
      stationNameEn: "Station 1",

      stationAddressVi: "Trạm giám sát bức xạ VieRad",
      stationAddressEn: "VieRad Radiation Monitoring Station",

      latestApiUrl:
        "https://ql4drki257.execute-api.ap-southeast-2.amazonaws.com/prod/latest",

      historyApiUrl:
        "https://ql4drki257.execute-api.ap-southeast-2.amazonaws.com/prod/history",

      refreshSeconds: 5,
      historyRefreshSeconds: 15,

      enabled: true
    },

    {
      stationId: "station_3",

      stationNameVi: "Trạm 2",
      stationNameEn: "Station 2",

      stationAddressVi: "Trạm giám sát bức xạ 2",
      stationAddressEn: "Radiation Monitoring Station 2",

      latestApiUrl:
        "https://z2c6um5ew3.execute-api.ap-southeast-1.amazonaws.com/data?station=station_03",

      historyApiUrl: "",

      refreshSeconds: 3,
      historyRefreshSeconds: 15,

      enabled: true
    },

    {
      stationId: "station_04",

      stationNameVi: "Trạm 3",
      stationNameEn: "Station 3",

      stationAddressVi: "Trạm giám sát bức xạ 3",
      stationAddressEn: "Radiation Monitoring Station 3",

      latestApiUrl:
        "https://z2c6um5ew3.execute-api.ap-southeast-1.amazonaws.com/data?station=station_04",

      historyApiUrl: "",

      refreshSeconds: 6,
      historyRefreshSeconds: 20,

      enabled: true
    }
  ],

  /*
   * GIỮ TƯƠNG THÍCH VỚI CODE WEB CŨ
   *
   * Nếu script.js cũ vẫn đọc apiUrl, stationId,
   * stationNameVi... thì Trạm 1 vẫn chạy bình thường.
   */
  apiUrl:
    "https://ql4drki257.execute-api.ap-southeast-2.amazonaws.com/prod/latest",

  latestApiUrl:
    "https://ql4drki257.execute-api.ap-southeast-2.amazonaws.com/prod/latest",

  historyApiUrl:
    "https://ql4drki257.execute-api.ap-southeast-2.amazonaws.com/prod/history",

  stationId: "new_station",

  stationNameVi: "Trạm 1",
  stationNameEn: "Station 1",

  stationAddressVi: "Trạm giám sát bức xạ VieRad",
  stationAddressEn: "VieRad Radiation Monitoring Station",

  refreshSeconds: 5,
  historyRefreshSeconds: 15,

  /*
   * APK MỚI NHẤT
   */
  apkPath:
    "https://github.com/duongthaovycute/VieRad3.3/releases/download/v4.1.0/VieRad.apk",

  apkVersion: "v4.1.0",

  developer: "Dương Thảo Vy",
  organization: "HCMUS"
};
```
