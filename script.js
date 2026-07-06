(() => {
  'use strict';

  const config = window.VIERAD_CONFIG || {};
  const stations = Array.isArray(config.stationData) ? config.stationData : [];
  const metrics = [
    { key: 'dose', label: 'Suất liều', unit: 'µSv/h', digits: 2 },
    { key: 'cps', label: 'Tốc độ đếm', unit: 'cps', digits: 0 },
    { key: 'cpm', label: 'Số đếm/phút', unit: 'CPM', digits: 0 },
    { key: 'total', label: 'Tổng số đếm', unit: 'Total', digits: 0 },
    { key: 'temp', label: 'Nhiệt độ', unit: '°C', digits: 0 },
    { key: 'humidity', label: 'Độ ẩm', unit: '%', digits: 0 }
  ];

  let metricIndex = 0;
  let activeStation = stations.find(s => s.id === config.defaultStation) || stations[0] || null;
  let chartData = [];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function safeText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setLink(id, url) {
    const el = document.getElementById(id);
    if (el && url) el.href = url;
  }

  function formatValue(value, digits = 2) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    if (Math.abs(Number(value)) >= 10000) return Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    return Number(value).toFixed(digits).replace(/\.0+$/, '');
  }

  function statusLabel(status) {
    switch (status) {
      case 'online': return 'Đang hoạt động';
      case 'warning': return 'Cảnh báo';
      case 'offline': return 'Mất kết nối';
      case 'idle': return 'Nghỉ';
      default: return 'Không rõ';
    }
  }

  function gaugeClass(station) {
    if (!station || station.status === 'offline' || station.dose === null) return 'offline';
    if (station.status === 'warning' || station.dose >= (config.safeLimit || 0.57)) return 'danger';
    if (station.dose >= (config.safeLimit || 0.57) * 0.75) return 'warning';
    return 'safe';
  }

  function applyConfig() {
    safeText('versionText', config.version || '4.0.0');
    safeText('downloadVersion', config.version || '4.0.0');
    safeText('releaseVersion', config.version || '4.0.0');
    safeText('apkSize', config.apkSize || 'Đang cập nhật');
    safeText('developerName', config.developer || 'Dương Thảo Vy');
    safeText('yearText', new Date().getFullYear());

    setLink('apkDownload', config.apkUrl || '#');
    setLink('heroDownload', config.apkUrl || '#download');
    setLink('openDemo', config.webDemoUrl || '#');
    setLink('githubLink', config.githubUrl || '#');

    const email = config.contactEmail || '';
    const emailLink = $('#emailLink');
    if (emailLink) emailLink.href = email ? `mailto:${email}?subject=VieRad` : '#';
  }

  function buildStationSelect() {
    const select = $('#stationSelect');
    if (!select) return;
    select.innerHTML = '';
    stations.forEach(station => {
      const option = document.createElement('option');
      option.value = station.id;
      option.textContent = station.name;
      select.appendChild(option);
    });
    if (activeStation) select.value = activeStation.id;
    select.addEventListener('change', () => {
      activeStation = stations.find(s => s.id === select.value) || activeStation;
      metricIndex = 0;
      updatePhone();
      drawChart();
    });
  }

  function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString('vi-VN', { hour12: false });
    safeText('heroClock', time);
  }

  function updatePhone() {
    if (!activeStation) return;
    const metric = metrics[metricIndex];
    const value = activeStation[metric.key];
    safeText('circleValue', formatValue(value, metric.digits));
    safeText('circleUnit', metric.unit);
    safeText('heroTemp', activeStation.temp === null || activeStation.temp === undefined ? '— °C' : `${activeStation.temp}°C`);
    safeText('heroHumidity', activeStation.humidity === null || activeStation.humidity === undefined ? '— %' : `${activeStation.humidity}%`);
    safeText('phoneNote', `${activeStation.name} • ${metric.label} • ${statusLabel(activeStation.status)}`);

    const circle = $('#doseCircle');
    if (circle) {
      circle.classList.remove('warning', 'danger', 'offline');
      const cls = gaugeClass(activeStation);
      if (cls !== 'safe') circle.classList.add(cls);
    }
  }

  function buildStationBoard() {
    const board = $('#stationBoard');
    if (!board) return;
    board.innerHTML = '';
    stations.forEach(station => {
      const card = document.createElement('article');
      card.className = 'station-card';
      const statusClass = `status-${station.status || 'idle'}`;
      card.innerHTML = `
        <div>
          <h3>${station.name}</h3>
          <strong>${formatValue(station.dose, 2)} ${station.dose === null ? '' : 'µSv/h'}</strong>
        </div>
        <span class="status-pill ${statusClass}">${statusLabel(station.status)}</span>
        <p>CPS: ${formatValue(station.cps, 0)} • CPM: ${formatValue(station.cpm, 0)} • Total: ${formatValue(station.total, 0)}</p>
      `;
      card.addEventListener('click', () => {
        activeStation = station;
        const select = $('#stationSelect');
        if (select) select.value = station.id;
        updatePhone();
        drawChart();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      board.appendChild(card);
    });
  }

  function makeChartData() {
    const base = activeStation && typeof activeStation.dose === 'number' ? activeStation.dose : 0.1;
    chartData = Array.from({ length: 28 }, (_, i) => {
      const wave = Math.sin(i / 3) * 0.035;
      const noise = (Math.random() - 0.5) * 0.045;
      return Math.max(0.01, base + wave + noise);
    });
  }

  function drawChart() {
    const canvas = $('#doseChart');
    if (!canvas) return;
    if (!chartData.length) makeChartData();
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const pad = 54;
    const max = Math.max(...chartData, config.safeLimit || 0.57) * 1.18;
    const min = 0;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-2').trim() || '#0b1728';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(169,184,194,0.18)';
    ctx.lineWidth = 1;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(169,184,194,0.86)';

    for (let i = 0; i <= 4; i++) {
      const y = pad + ((h - pad * 2) * i / 4);
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
      const value = max - ((max - min) * i / 4);
      ctx.fillText(value.toFixed(2), 10, y + 7);
    }

    const limit = config.safeLimit || 0.57;
    const yLimit = h - pad - ((limit - min) / (max - min)) * (h - pad * 2);
    ctx.strokeStyle = 'rgba(255,79,101,0.78)';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(pad, yLimit);
    ctx.lineTo(w - pad, yLimit);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,79,101,0.92)';
    ctx.fillText(`Ngưỡng ${limit}`, w - 190, yLimit - 10);

    const gradient = ctx.createLinearGradient(0, pad, 0, h - pad);
    gradient.addColorStop(0, 'rgba(123,240,228,0.32)');
    gradient.addColorStop(1, 'rgba(123,240,228,0.01)');

    const points = chartData.map((value, i) => ({
      x: pad + (w - pad * 2) * i / (chartData.length - 1),
      y: h - pad - ((value - min) / (max - min)) * (h - pad * 2)
    }));

    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.lineTo(w - pad, h - pad);
    ctx.lineTo(pad, h - pad);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.strokeStyle = 'rgba(123,240,228,0.96)';
    ctx.lineWidth = 4;
    ctx.stroke();

    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(123,240,228,0.98)';
      ctx.fill();
    });

    ctx.fillStyle = 'rgba(238,247,247,0.88)';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText(activeStation ? activeStation.name : 'Trạm demo', pad, 34);
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(169,184,194,0.86)';
    ctx.fillText('µSv/h', w - 112, 34);
  }

  function copyText(text) {
    if (!text) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => showToast('Đã copy link tải APK'));
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      showToast('Đã copy link tải APK');
    }
  }

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function setupEvents() {
    $('#doseCircle')?.addEventListener('click', () => {
      metricIndex = (metricIndex + 1) % metrics.length;
      updatePhone();
    });
    $('#randomizeChart')?.addEventListener('click', () => {
      makeChartData();
      drawChart();
    });
    $('#copyApk')?.addEventListener('click', () => copyText(config.apkUrl));
    $('#themeToggle')?.addEventListener('click', () => {
      document.body.classList.toggle('light');
      localStorage.setItem('vierad-theme', document.body.classList.contains('light') ? 'light' : 'dark');
      drawChart();
    });
    $('#menuToggle')?.addEventListener('click', () => document.body.classList.toggle('nav-open'));
    $$('.nav a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('nav-open')));
  }

  function setupReveal() {
    const elements = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('show'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    elements.forEach(el => observer.observe(el));
  }

  function init() {
    if (localStorage.getItem('vierad-theme') === 'light') document.body.classList.add('light');
    applyConfig();
    buildStationSelect();
    buildStationBoard();
    updateClock();
    updatePhone();
    makeChartData();
    drawChart();
    setupEvents();
    setupReveal();
    setInterval(updateClock, 1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
