(() => {
  "use strict";

  const config = window.VIERAD_CONFIG || {};
  const thresholds = config.thresholds || {
    caution: 0.5,
    warning: 1.0,
    danger: 4.0
  };

  const configuredStations = Array.isArray(config.stations)
    ? config.stations
    : [];

  const stations = configuredStations
    .filter((station) => station && station.enabled !== false)
    .map((station) => ({
      ...station,
      dose: null,
      cps: null,
      cpm: null,
      total: null,
      temp: null,
      humidity: null,
      timestamp: null,
      status: "offline",
      error: "",
      history: [],
      latestBusy: false,
      historyBusy: false,
      latestTimer: null,
      historyTimer: null
    }));

  const metrics = [
    { key: "dose", label: "Suất liều", unit: "µSv/h", digits: 3 },
    { key: "cps", label: "Tốc độ đếm", unit: "cps", digits: 0 },
    { key: "cpm", label: "Số đếm/phút", unit: "CPM", digits: 0 },
    { key: "total", label: "Tổng số đếm", unit: "Total", digits: 0 },
    { key: "temp", label: "Nhiệt độ", unit: "°C", digits: 1 },
    { key: "humidity", label: "Độ ẩm", unit: "%", digits: 1 }
  ];

  let metricIndex = 0;
  let activeStation =
    stations.find((station) => station.id === config.defaultStation) ||
    stations[0] ||
    null;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function safeText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setLink(id, url) {
    const element = document.getElementById(id);
    if (element && url) element.href = url;
  }

  function toFiniteNumber(value) {
    if (value === null || value === undefined || value === "") return null;

    if (typeof value === "string") {
      const cleaned = value
        .replace(",", ".")
        .replace(/[^\d+\-.eE]/g, "")
        .trim();

      if (!cleaned) return null;
      value = cleaned;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function firstNumber(object, keys) {
    if (!object || typeof object !== "object") return null;

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        const value = toFiniteNumber(object[key]);
        if (value !== null) return value;
      }
    }

    return null;
  }

  function firstValue(object, keys) {
    if (!object || typeof object !== "object") return null;

    for (const key of keys) {
      if (
        Object.prototype.hasOwnProperty.call(object, key) &&
        object[key] !== null &&
        object[key] !== undefined &&
        object[key] !== ""
      ) {
        return object[key];
      }
    }

    return null;
  }

  function parseJsonString(value) {
    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
      return value;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  function unwrapPayload(payload) {
    let current = parseJsonString(payload);

    for (let index = 0; index < 6; index += 1) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        break;
      }

      if (Object.prototype.hasOwnProperty.call(current, "body")) {
        current = parseJsonString(current.body);
        continue;
      }

      const wrapperKeys = [
        "data",
        "result",
        "item",
        "latest",
        "record",
        "measurement",
        "payload"
      ];

      const wrapperKey = wrapperKeys.find(
        (key) =>
          Object.prototype.hasOwnProperty.call(current, key) &&
          current[key] !== null &&
          current[key] !== undefined
      );

      if (!wrapperKey) break;
      current = parseJsonString(current[wrapperKey]);
    }

    return current;
  }

  function looksLikeMeasurement(object) {
    if (!object || typeof object !== "object" || Array.isArray(object)) {
      return false;
    }

    const keys = Object.keys(object).map((key) => key.toLowerCase());
    return keys.some((key) =>
      [
        "dose",
        "doserate",
        "dose_rate",
        "usvh",
        "usv_h",
        "cps",
        "cpm",
        "count",
        "counts",
        "temperature",
        "humidity"
      ].includes(key)
    );
  }

  function findMeasurement(payload, depth = 0) {
    if (depth > 8) return null;

    const current = unwrapPayload(payload);

    if (Array.isArray(current)) {
      for (let index = current.length - 1; index >= 0; index -= 1) {
        const found = findMeasurement(current[index], depth + 1);
        if (found) return found;
      }
      return null;
    }

    if (!current || typeof current !== "object") return null;
    if (looksLikeMeasurement(current)) return current;

    const preferredKeys = [
      "Items",
      "items",
      "records",
      "history",
      "measurements",
      "values"
    ];

    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        const found = findMeasurement(current[key], depth + 1);
        if (found) return found;
      }
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === "object") {
        const found = findMeasurement(value, depth + 1);
        if (found) return found;
      }
    }

    return null;
  }

  function collectMeasurements(payload, output = [], depth = 0) {
    if (depth > 8) return output;

    const current = unwrapPayload(payload);

    if (Array.isArray(current)) {
      current.forEach((item) => collectMeasurements(item, output, depth + 1));
      return output;
    }

    if (!current || typeof current !== "object") return output;

    if (looksLikeMeasurement(current)) {
      output.push(current);
      return output;
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === "object") {
        collectMeasurements(value, output, depth + 1);
      }
    }

    return output;
  }

  function parseTimestamp(value) {
    if (value === null || value === undefined || value === "") return null;

    if (typeof value === "number" || /^\d{10,13}$/.test(String(value))) {
      let timestamp = Number(value);
      if (timestamp < 1e12) timestamp *= 1000;

      const date = new Date(timestamp);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function normaliseMeasurement(raw) {
    const object = findMeasurement(raw) || raw;
    if (!object || typeof object !== "object") return null;

    const dose = firstNumber(object, [
      "dose",
      "doseRate",
      "dose_rate",
      "dose_rate_usvh",
      "doseRateUsvh",
      "usvh",
      "uSvH",
      "uSv_h",
      "radiation",
      "radiationLevel",
      "ambientDoseEquivalentRate"
    ]);

    const cps = firstNumber(object, [
      "cps",
      "CPS",
      "countPerSecond",
      "countsPerSecond",
      "count_rate",
      "countRate"
    ]);

    const cpm = firstNumber(object, [
      "cpm",
      "CPM",
      "countPerMinute",
      "countsPerMinute"
    ]);

    const total = firstNumber(object, [
      "total",
      "totalCount",
      "totalCounts",
      "count",
      "counts"
    ]);

    const temp = firstNumber(object, [
      "temp",
      "temperature",
      "Temperature",
      "temperatureC"
    ]);

    const humidity = firstNumber(object, [
      "humidity",
      "Humidity",
      "rh",
      "relativeHumidity"
    ]);

    const timestampValue = firstValue(object, [
      "timestamp",
      "time",
      "datetime",
      "dateTime",
      "createdAt",
      "created_at",
      "updatedAt",
      "updated_at",
      "measuredAt",
      "measured_at",
      "ts"
    ]);

    if (
      dose === null &&
      cps === null &&
      cpm === null &&
      total === null &&
      temp === null &&
      humidity === null
    ) {
      return null;
    }

    return {
      dose,
      cps,
      cpm,
      total,
      temp,
      humidity,
      timestamp: parseTimestamp(timestampValue)
    };
  }

  function formatValue(value, digits = 2) {
    const number = toFiniteNumber(value);
    if (number === null) return "—";

    if (Math.abs(number) >= 10000) {
      return Intl.NumberFormat("vi-VN", {
        notation: "compact",
        maximumFractionDigits: 1
      }).format(number);
    }

    return number
      .toFixed(digits)
      .replace(/(\.\d*?[1-9])0+$/, "$1")
      .replace(/\.0+$/, "");
  }

  function formatTimestamp(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("vi-VN", {
      hour12: false,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function statusFromDose(dose) {
    if (dose === null || dose === undefined) return "offline";
    if (dose >= thresholds.danger) return "danger";
    if (dose >= thresholds.warning) return "warning";
    if (dose >= thresholds.caution) return "caution";
    return "online";
  }

  function statusLabel(status) {
    switch (status) {
      case "online":
        return "Đang hoạt động";
      case "caution":
        return "Chú ý";
      case "warning":
        return "Cảnh báo";
      case "danger":
        return "Nguy hiểm";
      case "offline":
        return "Mất kết nối";
      default:
        return "Không rõ";
    }
  }

  function applyMeasurement(station, measurement) {
    if (!station || !measurement) return;

    ["dose", "cps", "cpm", "total", "temp", "humidity"].forEach((key) => {
      if (measurement[key] !== null && measurement[key] !== undefined) {
        station[key] = measurement[key];
      }
    });

    station.timestamp = measurement.timestamp || new Date();
    station.status = statusFromDose(station.dose);
    station.error = "";

    if (station.dose !== null && station.dose !== undefined) {
      station.history.push({
        dose: station.dose,
        timestamp: station.timestamp
      });

      const limit = Math.max(10, Number(config.maxHistoryPoints) || 2000);
      if (station.history.length > limit) {
        station.history.splice(0, station.history.length - limit);
      }
    }
  }

  async function fetchJson(url, timeoutMs = 12000) {
    if (!url) throw new Error("Thiếu địa chỉ API");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const separator = url.includes("?") ? "&" : "?";
      const response = await fetch(
        `${url}${separator}_=${Date.now()}`,
        {
          method: "GET",
          mode: "cors",
          cache: "no-store",
          headers: {
            Accept: "application/json"
          },
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      if (!text.trim()) throw new Error("API không trả dữ liệu");

      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  async function refreshLatest(station, manual = false) {
    if (!station || station.latestBusy || !station.latestApiUrl) return;
    if (document.hidden && !manual) return;

    station.latestBusy = true;

    try {
      const payload = await fetchJson(station.latestApiUrl);
      const measurement = normaliseMeasurement(payload);

      if (!measurement) {
        throw new Error("Không nhận diện được dữ liệu API");
      }

      applyMeasurement(station, measurement);
    } catch (error) {
      station.error =
        error && error.name === "AbortError"
          ? "API phản hồi quá lâu"
          : error?.message || "Không thể tải dữ liệu";

      if (!station.timestamp) station.status = "offline";
      console.error(`[VieRad] ${station.name}:`, error);
    } finally {
      station.latestBusy = false;
      renderAll();
    }
  }

  async function refreshHistory(station, manual = false) {
    if (
      !station ||
      station.historyBusy ||
      !station.historyApiUrl ||
      (document.hidden && !manual)
    ) {
      return;
    }

    station.historyBusy = true;

    try {
      const payload = await fetchJson(station.historyApiUrl, 18000);
      const rawMeasurements = collectMeasurements(payload);

      const history = rawMeasurements
        .map(normaliseMeasurement)
        .filter(
          (measurement) =>
            measurement &&
            measurement.dose !== null &&
            measurement.dose !== undefined
        )
        .map((measurement, index) => ({
          dose: measurement.dose,
          timestamp:
            measurement.timestamp ||
            new Date(Date.now() - (rawMeasurements.length - index) * 1000)
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      const limit = Math.max(10, Number(config.maxHistoryPoints) || 2000);
      if (history.length) {
        station.history = history.slice(-limit);
      }
    } catch (error) {
      console.error(`[VieRad history] ${station.name}:`, error);
    } finally {
      station.historyBusy = false;
      if (station === activeStation) drawChart();
    }
  }

  function scheduleLatest(station) {
    clearTimeout(station.latestTimer);

    const seconds = Math.max(2, Number(station.refreshSeconds) || 5);
    station.latestTimer = setTimeout(async () => {
      await refreshLatest(station);
      scheduleLatest(station);
    }, seconds * 1000);
  }

  function scheduleHistory(station) {
    clearTimeout(station.historyTimer);
    if (!station.historyApiUrl) return;

    const seconds = Math.max(
      10,
      Number(station.historyRefreshSeconds) || 15
    );

    station.historyTimer = setTimeout(async () => {
      await refreshHistory(station);
      scheduleHistory(station);
    }, seconds * 1000);
  }

  function applyConfig() {
    const version =
      String(config.apkVersion || config.version || "4.1.0").replace(/^v/i, "");

    safeText("versionText", version);
    safeText("downloadVersion", version);
    safeText("releaseVersion", version);
    safeText("apkSize", config.apkSize || "Đang cập nhật");
    safeText("developerName", config.developer || "Dương Thảo Vy");
    safeText("yearText", new Date().getFullYear());

    const apkUrl = config.apkPath || config.apkUrl || "#";
    setLink("apkDownload", apkUrl);
    setLink("heroDownload", apkUrl);
    setLink("openDemo", config.webDemoUrl || "#");
    setLink("githubLink", config.githubUrl || "#");

    const email = config.contactEmail || "";
    const emailLink = $("#emailLink");
    if (emailLink) {
      emailLink.href = email
        ? `mailto:${email}?subject=${encodeURIComponent("VieRad")}`
        : "#";
    }
  }

  function buildStationSelect() {
    const select = $("#stationSelect");
    if (!select) return;

    select.innerHTML = "";

    stations.forEach((station) => {
      const option = document.createElement("option");
      option.value = station.id;
      option.textContent = station.name;
      select.appendChild(option);
    });

    if (activeStation) select.value = activeStation.id;

    select.addEventListener("change", () => {
      activeStation =
        stations.find((station) => station.id === select.value) ||
        activeStation;

      metricIndex = 0;
      updatePhone();
      drawChart();

      if (activeStation) {
        refreshLatest(activeStation, true);
        refreshHistory(activeStation, true);
      }
    });
  }

  function updateClock() {
    const now = new Date();
    safeText(
      "heroClock",
      now.toLocaleTimeString("vi-VN", { hour12: false })
    );
  }

  function updatePhone() {
    if (!activeStation) return;

    const metric = metrics[metricIndex];
    const value = activeStation[metric.key];

    safeText("circleValue", formatValue(value, metric.digits));
    safeText("circleUnit", metric.unit);

    safeText(
      "heroTemp",
      activeStation.temp === null
        ? "— °C"
        : `${formatValue(activeStation.temp, 1)}°C`
    );

    safeText(
      "heroHumidity",
      activeStation.humidity === null
        ? "— %"
        : `${formatValue(activeStation.humidity, 1)}%`
    );

    const interval = Math.max(
      2,
      Number(activeStation.refreshSeconds) || 5
    );

    const updatedText = activeStation.timestamp
      ? ` • ${formatTimestamp(activeStation.timestamp)}`
      : "";

    safeText(
      "phoneNote",
      `${activeStation.name} • ${statusLabel(
        activeStation.status
      )} • Cập nhật ${interval} giây/lần${updatedText}`
    );

    const circle = $("#doseCircle");
    if (!circle) return;

    circle.classList.remove("warning", "danger", "offline");

    if (activeStation.status === "offline") {
      circle.classList.add("offline");
    } else if (
      activeStation.status === "warning" ||
      activeStation.status === "danger"
    ) {
      circle.classList.add("danger");
    } else if (activeStation.status === "caution") {
      circle.classList.add("warning");
    }
  }

  function buildStationBoard() {
    const board = $("#stationBoard");
    if (!board) return;

    board.innerHTML = "";

    stations.forEach((station) => {
      const card = document.createElement("article");
      card.className = "station-card";
      card.dataset.stationId = station.id;

      card.addEventListener("click", () => {
        activeStation = station;

        const select = $("#stationSelect");
        if (select) select.value = station.id;

        metricIndex = 0;
        updatePhone();
        drawChart();
        refreshLatest(station, true);
        refreshHistory(station, true);

        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      board.appendChild(card);
    });

    updateStationBoard();
  }

  function updateStationBoard() {
    stations.forEach((station) => {
      const card = document.querySelector(
        `.station-card[data-station-id="${CSS.escape(station.id)}"]`
      );

      if (!card) return;

      const statusClass =
        station.status === "danger"
          ? "status-warning"
          : `status-${station.status || "offline"}`;

      card.innerHTML = `
        <div>
          <h3>${station.name}</h3>
          <strong>${formatValue(station.dose, 3)} ${
            station.dose === null ? "" : "µSv/h"
          }</strong>
        </div>
        <span class="status-pill ${statusClass}">
          ${statusLabel(station.status)}
        </span>
        <p>
          CPS: ${formatValue(station.cps, 0)}
          • CPM: ${formatValue(station.cpm, 0)}
          • Total: ${formatValue(station.total, 0)}
        </p>
      `;
    });
  }

  function drawChart() {
    const canvas = $("#doseChart");
    if (!canvas || !activeStation) return;

    const data = activeStation.history
      .filter(
        (point) =>
          point &&
          Number.isFinite(Number(point.dose))
      )
      .slice(-80);

    const fallbackDose =
      toFiniteNumber(activeStation.dose) ??
      Math.max(0.01, Number(thresholds.caution) || 0.5);

    const chartData = data.length
      ? data
      : [{ dose: fallbackDose, timestamp: new Date() }];

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const padding = 54;

    const values = chartData.map((point) => Number(point.dose));
    const warningLine = Number(thresholds.warning) || 1;
    const maximum =
      Math.max(...values, warningLine, 0.01) * 1.18;
    const minimum = 0;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle =
      getComputedStyle(document.body)
        .getPropertyValue("--bg-2")
        .trim() || "#0b1728";

    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(169,184,194,0.18)";
    ctx.lineWidth = 1;
    ctx.font = "700 22px system-ui, sans-serif";
    ctx.fillStyle = "rgba(169,184,194,0.86)";

    for (let index = 0; index <= 4; index += 1) {
      const y =
        padding +
        ((height - padding * 2) * index) / 4;

      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      const value =
        maximum -
        ((maximum - minimum) * index) / 4;

      ctx.fillText(value.toFixed(2), 10, y + 7);
    }

    const warningY =
      height -
      padding -
      ((warningLine - minimum) / (maximum - minimum)) *
        (height - padding * 2);

    ctx.strokeStyle = "rgba(255,79,101,0.78)";
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(padding, warningY);
    ctx.lineTo(width - padding, warningY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255,79,101,0.92)";
    ctx.fillText(
      `Ngưỡng ${warningLine}`,
      width - 190,
      Math.max(24, warningY - 10)
    );

    const denominator = Math.max(1, chartData.length - 1);

    const points = chartData.map((point, index) => ({
      x:
        padding +
        ((width - padding * 2) * index) /
          denominator,
      y:
        height -
        padding -
        ((Number(point.dose) - minimum) /
          (maximum - minimum)) *
          (height - padding * 2)
    }));

    const gradient = ctx.createLinearGradient(
      0,
      padding,
      0,
      height - padding
    );

    gradient.addColorStop(0, "rgba(123,240,228,0.32)");
    gradient.addColorStop(1, "rgba(123,240,228,0.01)");

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index) ctx.lineTo(point.x, point.y);
      else ctx.moveTo(point.x, point.y);
    });

    ctx.lineTo(
      points[points.length - 1].x,
      height - padding
    );
    ctx.lineTo(points[0].x, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index) ctx.lineTo(point.x, point.y);
      else ctx.moveTo(point.x, point.y);
    });

    ctx.strokeStyle = "rgba(123,240,228,0.96)";
    ctx.lineWidth = 4;
    ctx.stroke();

    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(123,240,228,0.98)";
      ctx.fill();
    });

    ctx.fillStyle = "rgba(238,247,247,0.88)";
    ctx.font = "800 24px system-ui, sans-serif";
    ctx.fillText(activeStation.name, padding, 34);

    ctx.font = "700 18px system-ui, sans-serif";
    ctx.fillStyle = "rgba(169,184,194,0.86)";
    ctx.fillText("µSv/h", width - 112, 34);
  }

  function renderAll() {
    updatePhone();
    updateStationBoard();

    if (activeStation) drawChart();
  }

  function copyText(text) {
    if (!text) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast("Đã copy link tải APK"))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    showToast("Đã copy link tải APK");
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(
      () => toast.classList.remove("show"),
      2200
    );
  }

  function setupEvents() {
    $("#doseCircle")?.addEventListener("click", () => {
      metricIndex = (metricIndex + 1) % metrics.length;
      updatePhone();
    });

    $("#randomizeChart")?.addEventListener("click", async () => {
      if (!activeStation) return;

      showToast("Đang cập nhật dữ liệu");
      await Promise.all([
        refreshLatest(activeStation, true),
        refreshHistory(activeStation, true)
      ]);
    });

    $("#copyApk")?.addEventListener("click", () => {
      copyText(config.apkPath || config.apkUrl || "");
    });

    $("#themeToggle")?.addEventListener("click", () => {
      document.body.classList.toggle("light");

      localStorage.setItem(
        "vierad-theme",
        document.body.classList.contains("light")
          ? "light"
          : "dark"
      );

      drawChart();
    });

    $("#menuToggle")?.addEventListener("click", () => {
      document.body.classList.toggle("nav-open");
    });

    $$(".nav a").forEach((link) => {
      link.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
      });
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        stations.forEach((station) => {
          refreshLatest(station, true);
          refreshHistory(station, true);
        });
      }
    });

    window.addEventListener("online", () => {
      stations.forEach((station) => {
        refreshLatest(station, true);
        refreshHistory(station, true);
      });
    });
  }

  function setupReveal() {
    const elements = $$(".reveal");

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) =>
        element.classList.add("show")
      );
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    elements.forEach((element) => observer.observe(element));
  }

  async function startStationUpdates() {
    await Promise.all(
      stations.map((station) => refreshLatest(station, true))
    );

    await Promise.all(
      stations
        .filter((station) => station.historyApiUrl)
        .map((station) => refreshHistory(station, true))
    );

    stations.forEach((station) => {
      scheduleLatest(station);
      scheduleHistory(station);
    });
  }

  function init() {
    if (localStorage.getItem("vierad-theme") === "light") {
      document.body.classList.add("light");
    }

    applyConfig();
    buildStationSelect();
    buildStationBoard();
    updateClock();
    updatePhone();
    drawChart();
    setupEvents();
    setupReveal();

    setInterval(updateClock, 1000);
    startStationUpdates();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
