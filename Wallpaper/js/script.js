// ==========================================
// 1. CẤU HÌNH & TRẠNG THÁI TOÀN CỤC
// ==========================================
let config = {
  themeStyle: 0,            // 0: Modern, 1: Classic
  visualizerStyle: 0,       // 0: Centered Bars, 1: Floating Dots
  useAlbumColorForVis: true,
  showShader: true,
  parallax: true,
  verticalScale: 8,
  dotScale: 1.0,
  sortingMode: 2
};

let spectrumColor = "rgba(255, 255, 255, 0.85)";
let currentBars = [];
let targetBars = [];
const LERP_FACTOR = 0.25;

let currentTrackInfo = { title: "", artist: "" };
let parsedLyrics = [];
let lastActiveLyric = "";
let currentDuration = 0;
let actualPosition = 0;     // Vị trí phát thực tế từ C#
let wsInstance = null;

let isDragging = false;
let dragRatio = 0;

// ==========================================
// 2. LẮNG NGHE TÙY BIẾN LIVELY PROPERTIES
// ==========================================
function livelyPropertyListener(name, val) {
  switch (name) {
    case "themeStyle":
      config.themeStyle = val;
      document.body.classList.remove("theme-modern", "theme-classic");
      document.body.classList.add(val === 0 ? "theme-modern" : "theme-classic");
      break;

    case "visualizerStyle":
      config.visualizerStyle = val;
      break;

    case "useAlbumColorForVis":
      config.useAlbumColorForVis = val;
      break;

    case "showBackgroundShader":
      config.showShader = val;
      const bg = document.querySelector(".fluid-background");
      if (bg) bg.style.display = val ? "block" : "none";
      break;

    case "parallaxToggle":
      config.parallax = val;
      if (!val) {
        const player = document.querySelector(".player-container");
        if (player) player.style.transform = "translate(0px, 0px)";
      }
      break;

    case "verticalScale":
      config.verticalScale = val;
      break;

    case "dotScale":
      config.dotScale = val;
      break;

    case "sortingMode":
      config.sortingMode = val;
      break;
  }
}

// Parallax theo chuột
window.addEventListener("mousemove", (e) => {
  if (!config.parallax) return;
  const player = document.querySelector(".player-container");
  if (!player) return;

  const x = (e.clientX - window.innerWidth / 2) / 45;
  const y = (e.clientY - window.innerHeight / 2) / 45;
  player.style.transform = `translate(${x}px, ${y}px)`;
});

// ==========================================
// 3. CANVAS SPECTRUM VISUALIZER (BARS & DOTS)
// ==========================================
const canvas = document.getElementById("visualizer-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function livelyAudioListener(audioArray) {
  if (!audioArray || audioArray.length === 0) return;

  let processedArray = [...audioArray];
  if (config.sortingMode === 0) {
    processedArray.sort((a, b) => b - a);
  } else if (config.sortingMode === 1) {
    const half = Math.floor(processedArray.length / 2);
    const left = processedArray.slice(0, half).reverse();
    const right = processedArray.slice(half);
    processedArray = left.concat(right);
  }

  targetBars = processedArray;
  if (currentBars.length !== targetBars.length) {
    currentBars = new Array(targetBars.length).fill(0);
  }
}

function renderVisualizer() {
  requestAnimationFrame(renderVisualizer);
  if (!ctx || !canvas || currentBars.length === 0) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const numBars = currentBars.length;
  const barWidth = Math.max(2, config.dotScale * 3.5);
  const spacing = canvas.width / numBars;
  const centerY = canvas.height / 2;

  ctx.fillStyle = config.useAlbumColorForVis ? spectrumColor : "rgba(255, 255, 255, 0.85)";

  for (let i = 0; i < numBars; i++) {
    const target = targetBars[i] || 0;
    currentBars[i] += (target - currentBars[i]) * LERP_FACTOR;

    const amp = Math.max(2, currentBars[i] * config.verticalScale * 14);
    const x = i * spacing + (spacing - barWidth) / 2;

    if (config.visualizerStyle === 0) {
      // Dạng thanh bo tròn đối xứng
      const totalHeight = amp * 2;
      const topY = centerY - amp;
      const cornerRadius = barWidth / 2;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, topY, barWidth, totalHeight, cornerRadius);
      } else {
        ctx.rect(x, topY, barWidth, totalHeight);
      }
      ctx.fill();
    } else {
      // Dạng hạt bi đối xứng
      const radius = Math.max(1, config.dotScale * 2.5);
      const dotX = i * spacing + spacing / 2;

      ctx.beginPath();
      ctx.arc(dotX, centerY - amp, radius, 0, Math.PI * 2);
      ctx.arc(dotX, centerY + amp, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
renderVisualizer();

// ==========================================
// 4. TRÍCH XUẤT MÀU & TỰ ĐỘNG CHUYỂN TRẮNG NẾU QUÁ TỐI
// ==========================================
const colorThief = new ColorThief();

function updateThemeColors(imgElement) {
  try {
    const palette = colorThief.getPalette(imgElement, 5);
    if (palette && palette.length >= 2) {
      const c1 = palette[0];
      const c2 = palette[1];
      const c3 = palette[2] || palette[0];

      // Tính độ sáng tương đối (Luminance) theo chuẩn W3C
      const luminance = 0.299 * c1[0] + 0.587 * c1[1] + 0.114 * c1[2];

      // Nếu màu quá tối (Luminance < 60), ép về màu trắng để thanh không bị chìm
      if (luminance < 60) {
        spectrumColor = "rgba(255, 255, 255, 0.88)";
        document.documentElement.style.setProperty("--text-accent", "rgba(255, 255, 255, 0.8)");
      } else {
        spectrumColor = `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, 0.88)`;
        document.documentElement.style.setProperty("--text-accent", `rgb(${c3[0]}, ${c3[1]}, ${c3[2]})`);
      }

      // Cập nhật 2 quả cầu shader nền
      document.documentElement.style.setProperty("--primary-color", `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, 0.45)`);
      document.documentElement.style.setProperty("--secondary-color", `rgba(${c2[0]}, ${c2[1]}, ${c2[2]}, 0.4)`);
    }
  } catch (err) {
    spectrumColor = "rgba(255, 255, 255, 0.85)";
    document.documentElement.style.setProperty("--primary-color", "rgba(120, 150, 255, 0.4)");
    document.documentElement.style.setProperty("--secondary-color", "rgba(255, 90, 160, 0.35)");
    document.documentElement.style.setProperty("--text-accent", "rgba(255, 255, 255, 0.65)");
  }
}

const albumArtImg = document.getElementById("album-art");
if (albumArtImg) {
  albumArtImg.addEventListener("load", function () {
    if (albumArtImg.src && !albumArtImg.src.startsWith("data:image/svg")) {
      updateThemeColors(albumArtImg);
    }
  });
}

function livelyCurrentTrack(data) {
  if (!data) return;
  const obj = typeof data === "string" ? JSON.parse(data) : data;

  const title = obj.Title || "";
  const artist = obj.Artist || "";

  if (title !== currentTrackInfo.title || artist !== currentTrackInfo.artist) {
    currentTrackInfo = { title, artist };

    const titleEl = document.getElementById("track-title");
    const artistEl = document.getElementById("track-artist");

    if (titleEl) titleEl.innerText = title || "Waiting for music...";
    if (artistEl) artistEl.innerText = artist || "Unknown Artist";

    if (albumArtImg) {
      if (obj.Thumbnail) {
        albumArtImg.src = "data:image/png;base64," + obj.Thumbnail;
      } else {
        albumArtImg.src = "";
      }
    }

    parsedLyrics = [];
    lastActiveLyric = "";
    updateLyricUI("");
    fetchLyrics(title, artist);
  }
}

// ==========================================
// 5. TẢI VÀ ĐỒNG BỘ LỜI BÀI HÁT (LRCLIB)
// ==========================================
async function fetchLyrics(title, artist) {
  if (!title) return;

  try {
    let cleanTitle = title
      .replace(/\([^)]*\)|\[[^\]]*\]/g, "")
      .replace(/-.*(remaster|live|edit|version|mono|stereo).*/gi, "")
      .trim();

    let cleanArtist = artist.split(/,|&|feat\.|ft\./i)[0].trim();

    let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    let res = await fetch(url);
    let data = null;

    if (res.ok) {
      data = await res.json();
    }

    if (!data || !data.syncedLyrics) {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle + " " + cleanArtist)}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const searchResults = await searchRes.json();
        if (Array.isArray(searchResults) && searchResults.length > 0) {
          data = searchResults.find((item) => item.syncedLyrics) || searchResults[0];
        }
      }
    }

    if (data && data.syncedLyrics) {
      parsedLyrics = parseLRC(data.syncedLyrics);
    } else {
      updateLyricUI("");
    }
  } catch (err) {
    updateLyricUI("");
  }
}

function parseLRC(lrcText) {
  const lines = lrcText.split("\n");
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (let line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseFloat(match[1]);
      const seconds = parseFloat(match[2]);
      const fraction = parseFloat(match[3]) / (match[3].length === 3 ? 1000 : 100);
      const totalSeconds = minutes * 60 + seconds + fraction;
      const text = line.replace(timeRegex, "").trim();
      result.push({ time: totalSeconds, text });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

function updateLyricUI(text) {
  const el = document.getElementById("current-lyric");
  if (!el) return;
  if (el.innerText !== text) {
    el.innerText = text;
  }
}

function syncLyrics(currentPosition) {
  if (!parsedLyrics.length) return;

  let activeIndex = -1;
  for (let i = 0; i < parsedLyrics.length; i++) {
    if (currentPosition >= parsedLyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  const activeText = activeIndex !== -1 ? parsedLyrics[activeIndex].text : "";
  if (activeText !== lastActiveLyric) {
    lastActiveLyric = activeText;
    updateLyricUI(activeText);
  }
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function updatePlayPauseIcon(status) {
  const playIcon = document.getElementById("icon-play");
  const pauseIcon = document.getElementById("icon-pause");
  if (!playIcon || !pauseIcon) return;

  if (status === "Playing") {
    playIcon.style.display = "none";
    pauseIcon.style.display = "block";
  } else {
    playIcon.style.display = "block";
    pauseIcon.style.display = "none";
  }
}

// ==========================================
// 6. WEBSOCKET KẾT NỐI MEDIA TIMELINE BRIDGE
// ==========================================
function initWebSocket() {
  const socket = new WebSocket("ws://127.0.0.1:8181");
  wsInstance = socket;

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const position = data.position;
      const duration = data.duration;
      currentDuration = duration;
      actualPosition = position;

      syncLyrics(position);
      updatePlayPauseIcon(data.status);

      // Cập nhật tiến trình thời gian
      if (duration > 0 && !isDragging) {
        const percent = Math.min((position / duration) * 100, 100);
        const fillEl = document.getElementById("progress-bar-fill");
        const seekThumbEl = document.getElementById("seek-thumb");
        const currEl = document.getElementById("current-time");
        const totalEl = document.getElementById("total-duration");

        if (fillEl) fillEl.style.width = `${percent}%`;
        if (seekThumbEl) seekThumbEl.style.left = `${percent}%`; // Luôn khóa núm tròn theo tiến trình thực tế

        if (currEl) currEl.innerText = formatTime(position);
        if (totalEl) totalEl.innerText = formatTime(duration);
      }

      const artWrapper = document.querySelector(".album-art-wrapper");
      if (artWrapper && config.themeStyle === 0) {
        artWrapper.style.transform = data.status === "Playing" ? "scale(1)" : "scale(0.94)";
        artWrapper.style.opacity = data.status === "Playing" ? "1" : "0.8";
      }
    } catch (e) {}
  };

  socket.onclose = () => {
    wsInstance = null;
    setTimeout(initWebSocket, 2000);
  };

  socket.onerror = () => {
    socket.close();
  };
}

initWebSocket();

// ==========================================
// 7. THANH TIẾN TRÌNH: PREVIEW VỆT SÁNG & KÉO THẢ
// ==========================================
const progressContainer = document.querySelector(".progress-container");
const progressBar = document.getElementById("progress-bar-bg");
const progressFill = document.getElementById("progress-bar-fill");
const progressHover = document.getElementById("progress-bar-hover");
const seekThumb = document.getElementById("seek-thumb");
const currentTimeEl = document.getElementById("current-time");

if (progressBar && seekThumb) {
  function getProgressRatio(clientX) {
    const rect = progressBar.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(x / rect.width, 1));
  }

  // 1. Khi rê chuột: Chỉ cập nhật độ dài thanh preview, giữ nguyên vị trí núm tròn
  progressBar.addEventListener("mousemove", (e) => {
    if (currentDuration <= 0) return;
    const ratio = getProgressRatio(e.clientX);
    const percent = ratio * 100;

    if (progressHover) {
      progressHover.style.width = `${percent}%`;
    }

    // Nếu đang nhấn giữ kéo chuột thì núm tròn và thanh fill mới chạy theo
    if (isDragging) {
      dragRatio = ratio;
      seekThumb.style.left = `${percent}%`;
      if (progressFill) progressFill.style.width = `${percent}%`;
      if (currentTimeEl) currentTimeEl.innerText = formatTime(ratio * currentDuration);
    }
  });

  // 2. Khi chuột rời thanh: ẩn thanh preview
  progressBar.addEventListener("mouseleave", () => {
    if (!isDragging && currentDuration > 0) {
      if (progressHover) progressHover.style.width = `0%`;
      // Đảm bảo núm tròn và thanh fill vẫn nằm đúng vị trí phát hiện tại
      const realPercent = Math.min((actualPosition / currentDuration) * 100, 100);
      seekThumb.style.left = `${realPercent}%`;
      if (currentTimeEl) currentTimeEl.innerText = formatTime(actualPosition);
    }
  });

  // 3. Nhấn chuột xuống: bắt đầu kéo tua
  progressBar.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || currentDuration <= 0) return;
    isDragging = true;
    dragRatio = getProgressRatio(e.clientX);
    progressContainer.classList.add("dragging");

    const percent = dragRatio * 100;
    seekThumb.style.left = `${percent}%`;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (currentTimeEl) currentTimeEl.innerText = formatTime(dragRatio * currentDuration);
  });

  // 4. Kéo chuột tự do trên toàn màn hình
  window.addEventListener("mousemove", (e) => {
    if (isDragging && currentDuration > 0) {
      dragRatio = getProgressRatio(e.clientX);
      const percent = dragRatio * 100;

      seekThumb.style.left = `${percent}%`;
      if (progressFill) progressFill.style.width = `${percent}%`;
      if (progressHover) progressHover.style.width = `${percent}%`;
      if (currentTimeEl) currentTimeEl.innerText = formatTime(dragRatio * currentDuration);
    }
  });

  // 5. Thả chuột: Thực hiện tua nhạc đến vị trí mới
  window.addEventListener("mouseup", (e) => {
    if (!isDragging) return;
    isDragging = false;
    progressContainer.classList.remove("dragging");

    const targetSeconds = dragRatio * currentDuration;

    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      wsInstance.send(JSON.stringify({
        action: "seek",
        position: targetSeconds
      }));
    }
  });
}

// Cụm nút điều khiển Media
function sendMediaAction(actionName) {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify({ action: actionName }));
  }
}

document.getElementById("btn-prev")?.addEventListener("click", () => sendMediaAction("previous"));
document.getElementById("btn-next")?.addEventListener("click", () => sendMediaAction("next"));
document.getElementById("btn-play-pause")?.addEventListener("click", () => sendMediaAction("togglePlayPause"));