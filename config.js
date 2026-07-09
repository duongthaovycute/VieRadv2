window.VIERAD_CONFIG = {
  version: "4.1.0",
  defaultStation: "station_1",
  maxHistoryPoints: 2000,

  thresholds: {
    caution: 0.5,
    warning: 1.0,
    danger: 4.0
  },

  stations: [
    {
      id: "station_1",
      name: "Trạm 1",
      nameEn: "Station 1",
      address: "Trạm giám sát bức xạ VieRad",
      addressEn: "VieRad Radiation Monitoring Station",
      latestApiUrl:
        "https://ql4drki257.execute-api.ap-southeast-2.amazonaws.com/prod/history",
      historyApiUrl:
        "https://ql4drki257.execute-api.ap-southeast-2.amazonaws.com/prod/history",
      historyFromLatest: true,
      refreshSeconds: 2,
      historyRefreshSeconds: 15,
      enabled: true
    },

    {
      id: "station_2",
      apiStationId: "station_03",
      name: "Trạm 2",
      nameEn: "Station 2",
      address: "Trạm giám sát bức xạ 2",
      addressEn: "Radiation Monitoring Station 2",
      latestApiUrl:
        "https://z2c6um5ew3.execute-api.ap-southeast-1.amazonaws.com/data?station=station_03",
      historyApiUrl: "",
      refreshSeconds: 5,
      historyRefreshSeconds: 15,
      enabled: true
    },

    {
      id: "station_3",
      apiStationId: "station_04",
      name: "Trạm 3",
      nameEn: "Station 3",
      address: "Trạm giám sát bức xạ 3",
      addressEn: "Radiation Monitoring Station 3",
      latestApiUrl:
        "https://z2c6um5ew3.execute-api.ap-southeast-1.amazonaws.com/data?station=station_04",
      historyApiUrl: "",
      refreshSeconds: 7,
      historyRefreshSeconds: 20,
      enabled: true
    }
  ],

  apiUrl:
    "https://ql4drki257.execute-api.ap-southeast-2.amazonaws.com/prod/history",
  latestApiUrl:
    "https://ql4drki257.execute-api.ap-southeast-2.amazonaws.com/prod/history",
  historyApiUrl:
    "https://ql4drki257.execute-api.ap-southeast-2.amazonaws.com/prod/history",
  stationId: "station_1",
  stationNameVi: "Trạm 1",
  stationNameEn: "Station 1",
  stationAddressVi: "Trạm giám sát bức xạ VieRad",
  stationAddressEn: "VieRad Radiation Monitoring Station",
  refreshSeconds: 2,
  historyRefreshSeconds: 15,

  apkPath:
    "https://github.com/duongthaovycute/VieRadv2/releases/download/v4.1.0/VieRad.apk",
  apkUrl:
    "https://github.com/duongthaovycute/VieRadv2/releases/download/v4.1.0/VieRad.apk",
  apkVersion: "v4.1.0",
  apkSize: "77,9 MB",

  webDemoUrl: "https://duongthaovycute.github.io/VieRadv2/",
  githubUrl: "https://github.com/duongthaovycute",
  contactEmail: "thaovy.tyty@gmail.com",
  developer: "Dương Thảo Vy",
  organization: "HCMUS"
};
