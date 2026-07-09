/*
  VieRad Website Config
  Bé Vy chỉ cần sửa file này khi đổi link tải, phiên bản, GitHub hoặc web demo.
*/
window.VIERAD_CONFIG = {
  appName: 'VieRad',
  version: '4.1.0',
  apkUrl: 'https://github.com/duongthaovycute/VieRad3.3/releases/download/v4.1.0/VieRad.apk',
  webDemoUrl: 'https://duongthaovycute.github.io/VieRad3.3/',
  githubUrl: 'https://github.com/duongthaovycute',
  developer: 'Dương Thảo Vy',
  contactEmail: 'thaovy.tyty@gmail.com',
  lastUpdated: '06/07/2026',
  apkSize: 'Đang cập nhật',
  defaultStation: 'station_01',
  safeLimit: 0.57,
  stationData: [
    { id: 'station_01', name: 'Trạm 1', dose: 0.40, cps: 7, cpm: 420, total: 275000, temp: 31, humidity: 57, status: 'online' },
    { id: 'station_02', name: 'Trạm 2', dose: 0.08, cps: 2, cpm: 120, total: 80430, temp: 30, humidity: 61, status: 'online' },
    { id: 'station_03', name: 'Trạm 3', dose: 0.12, cps: 3, cpm: 180, total: 101920, temp: 30, humidity: 58, status: 'online' },
    { id: 'station_04', name: 'Trạm 4', dose: 0.61, cps: 11, cpm: 660, total: 381240, temp: 32, humidity: 63, status: 'warning' },
    { id: 'station_05', name: 'Trạm 5', dose: 0.00, cps: 0, cpm: 0, total: 0, temp: null, humidity: null, status: 'idle' },
    { id: 'rewes', name: 'ReWES', dose: 0.13, cps: 3, cpm: 192, total: 194000, temp: 29, humidity: 62, status: 'online' },
    { id: 'bluetooth', name: 'Bluetooth LE', dose: null, cps: null, cpm: null, total: null, temp: null, humidity: null, status: 'offline' }
  ]
};
