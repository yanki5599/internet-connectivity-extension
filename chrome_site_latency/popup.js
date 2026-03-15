const latencyEl = document.getElementById('latency-value');
const statusEl = document.getElementById('status-label');
const bulbEl = document.getElementById('status-bulb');
const urlEl = document.getElementById('site-url');
const avgEl = document.getElementById('avg-latency');
const canvas = document.getElementById('mini-graph');
const ctx = canvas.getContext('2d');

let latencyHistory = [];
const MAX_HISTORY = 40;
let currentUrl = "";

// Initialize canvas size
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

function updateUI(status, latency) {
  if (status === "online") {
    latencyEl.textContent = latency;
    statusEl.textContent = "Online";
    statusEl.className = "status-online";
    bulbEl.className = "bulb-online";
    
    // Dynamic color based on latency
    if (latency < 100) latencyEl.className = "fast";
    else if (latency < 300) latencyEl.className = "medium";
    else latencyEl.className = "slow";

    latencyHistory.push(latency);
    if (latencyHistory.length > MAX_HISTORY) latencyHistory.shift();
    
    const avg = Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length);
    avgEl.textContent = `${avg} ms`;
    
    drawGraph();
  } else {
    latencyEl.textContent = "--";
    statusEl.textContent = "Offline";
    statusEl.className = "status-offline";
    bulbEl.className = "bulb-offline";
    latencyEl.className = "";
  }
}

function drawGraph() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (latencyHistory.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  const step = canvas.width / (MAX_HISTORY - 1);
  const maxLat = Math.max(...latencyHistory, 500);
  
  latencyHistory.forEach((lat, i) => {
    const x = i * step;
    const y = canvas.height - (lat / maxLat * canvas.height);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  // Gradient area
  ctx.lineTo( (latencyHistory.length - 1) * step, canvas.height);
  ctx.lineTo(0, canvas.height);
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
  grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = grad;
  ctx.fill();
}

async function checkLatency() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab && tab.url && tab.url.startsWith("http")) {
    const url = new URL(tab.url).origin;
    if (currentUrl !== url) {
      currentUrl = url;
      urlEl.textContent = url;
      latencyHistory = []; // Reset history for new site
    }

    chrome.runtime.sendMessage({ action: "measureLatency", url: url }, (response) => {
      if (chrome.runtime.lastError) {
        updateUI("offline", null);
      } else {
        updateUI(response.status, response.latency);
      }
    });
  } else {
    urlEl.textContent = "Invalid tab (try a website)";
    updateUI("offline", null);
  }
}

// Check immediately then every 2 seconds
checkLatency();
setInterval(checkLatency, 2000);
