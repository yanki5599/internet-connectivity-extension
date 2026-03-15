(function() {
  if (window.latencyWidgetInitialized) return;
  window.latencyWidgetInitialized = true;

  // Create UI elements
  const widget = document.createElement('div');
  widget.id = 'latency-floating-widget';
  widget.innerHTML = `
    <div class="latency-header">
      <span class="latency-title">Site Latency</span>
      <span id="stability-val" class="stability-tag">Stable</span>
    </div>
    <div class="main-stat">
      <span id="latency-num" class="latency-num">--</span>
      <span class="latency-unit">ms</span>
    </div>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">Jitter</span>
        <span id="jitter-val" class="stat-value">--</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Status</span>
        <span id="status-text" class="stat-value"><span class="status-indicator offline"></span>Offline</span>
      </div>
    </div>
    <div class="graph-box">
      <canvas id="latency-canvas"></canvas>
    </div>
  `;
  document.body.appendChild(widget);

  const canvas = widget.querySelector('#latency-canvas');
  const ctx = canvas.getContext('2d');
  const latencyNum = widget.querySelector('#latency-num');
  const stabilityVal = widget.querySelector('#stability-val');
  const jitterVal = widget.querySelector('#jitter-val');
  const statusText = widget.querySelector('#status-text');

  let history = [];
  const MAX_HISTORY = 60;
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  // Dragging logic
  widget.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    if (e.target.closest('.latency-header') || e.target === widget) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;
      setTranslate(currentX, currentY, widget);
    }
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }

  function dragEnd() {
    isDragging = false;
  }

  // Latency Measurement
  function updateData() {
    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      console.log("[Latency] Extension context invalidated. Stopping tracker.");
      if (window.latencyInterval) clearInterval(window.latencyInterval);
      return;
    }

    try {
      chrome.runtime.sendMessage({ 
        action: "measureLatency", 
        url: window.location.origin 
      }, (response) => {
        if (chrome.runtime.lastError) {
          processPing(null);
        } else {
          processPing(response.status === "online" ? response.latency : null);
        }
      });
    } catch (e) {
      // Catch "Extension context invalidated"
      if (window.latencyInterval) clearInterval(window.latencyInterval);
    }
  }

  function processPing(latency) {
    // Re-check context before updating UI
    if (!chrome.runtime?.id) return;
    
    history.push(latency);
    if (history.length > MAX_HISTORY) history.shift();

    if (latency !== null) {
      latencyNum.textContent = latency;
      latencyNum.className = 'latency-num ' + (latency < 100 ? 'text-green' : latency < 300 ? 'text-yellow' : 'text-red');
      statusText.innerHTML = '<span class="status-indicator online"></span>Online';
    } else {
      latencyNum.textContent = '!!!';
      latencyNum.className = 'latency-num text-red';
      statusText.innerHTML = '<span class="status-indicator offline"></span>Offline';
    }

    calculateMetrics();
    drawGraph();
  }

  function calculateMetrics() {
    const validHistory = history.filter(x => x !== null);
    if (validHistory.length < 2) return;

    // Jitter (Average variation)
    let totalJitter = 0;
    for (let i = 1; i < validHistory.length; i++) {
      totalJitter += Math.abs(validHistory[i] - validHistory[i-1]);
    }
    const avgJitter = Math.round(totalJitter / (validHistory.length - 1));
    jitterVal.textContent = `${avgJitter}ms`;

    // Stability
    const packetLoss = (history.filter(x => x === null).length / history.length) * 100;
    if (packetLoss > 20 || avgJitter > 100) {
      stabilityVal.textContent = 'Unstable';
      stabilityVal.style.background = 'rgba(239, 68, 68, 0.2)';
      stabilityVal.style.color = '#ef4444';
    } else if (packetLoss > 0 || avgJitter > 40) {
      stabilityVal.textContent = 'Fair';
      stabilityVal.style.background = 'rgba(245, 158, 11, 0.2)';
      stabilityVal.style.color = '#f59e0b';
    } else {
      stabilityVal.textContent = 'Stable';
      stabilityVal.style.background = 'rgba(16, 185, 129, 0.2)';
      stabilityVal.style.color = '#10b981';
    }
  }

  function drawGraph() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (history.length < 2) return;

    const step = canvas.width / (MAX_HISTORY - 1);
    const validValues = history.filter(v => v !== null);
    const maxLat = Math.max(...validValues, 500);

    // Draw background grid/bars for disconnects
    history.forEach((lat, i) => {
      if (lat === null) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.fillRect(i * step, 0, step, canvas.height);
        
        // Vertical red line for the disconnect
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.moveTo(i * step + step/2, 0);
        ctx.lineTo(i * step + step/2, canvas.height);
        ctx.stroke();
      }
    });

    // Draw line
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#6366f1';

    let firstMove = true;
    history.forEach((lat, i) => {
      if (lat !== null) {
        const x = i * step;
        const y = canvas.height - (lat / maxLat * canvas.height);
        if (firstMove) {
          ctx.moveTo(x, y);
          firstMove = false;
        } else {
          ctx.lineTo(x, y);
        }
      } else {
        // Break the line on disconnect
        firstMove = true;
      }
    });
    ctx.stroke();
  }

  // Initial and interval
  function tick() {
    if (document.visibilityState === 'visible') {
      updateData();
    }
  }

  tick();
  window.latencyInterval = setInterval(tick, 2000);

  // Resume immediately when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateData();
    }
  });

})();
