(function() {
  if (window.latencyWidgetInitialized) return;
  window.latencyWidgetInitialized = true;

  // Create UI elements
  const widget = document.createElement('div');
  widget.id = 'latency-floating-widget';
  widget.innerHTML = `
    <div class="latency-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="latency-title">Latency</span>
        <span id="stability-val" class="stability-tag">Stable</span>
      </div>
      <div style="display: flex; gap: 4px;">
        <div id="latency-min-btn" class="latency-action-btn" title="Minimize">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </div>
        <div id="latency-close-btn" class="latency-action-btn close" title="Hide (Check popup settings)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </div>
      </div>
    </div>
    <div class="main-stat">
      <span id="latency-num" class="latency-num">--</span>
      <span class="latency-unit">ms</span>
    </div>
    <div id="minimized-info" class="minimized-info">--ms</div>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">Jitter / ISP</span>
        <div id="isp-jitter-box" style="display: flex; gap: 4px; align-items: center;">
          <span id="jitter-val" class="stat-value">--</span>
          <span style="color: #475569">|</span>
          <span id="isp-val" class="stat-value" title="Global ISP Health">--</span>
        </div>
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
  const closeBtn = widget.querySelector('#latency-close-btn');
  const minBtn = widget.querySelector('#latency-min-btn');
  const ispVal = widget.querySelector('#isp-val');
  const minimizedInfo = widget.querySelector('#minimized-info');

  // Load and listen for changes
  function updateState() {
    chrome.storage.local.get(['showOverlay', 'isMinimized'], (result) => {
      widget.style.display = result.showOverlay !== false ? 'block' : 'none';
      if (result.isMinimized) {
        widget.classList.add('collapsed');
      } else {
        widget.classList.remove('collapsed');
      }
    });
  }

  updateState();
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.showOverlay) {
      widget.style.display = changes.showOverlay.newValue !== false ? 'block' : 'none';
    }
    if (changes.isMinimized) {
      if (changes.isMinimized.newValue) widget.classList.add('collapsed');
      else widget.classList.remove('collapsed');
    }
  });

  minBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isNowMinimized = !widget.classList.contains('collapsed');
    chrome.storage.local.set({ isMinimized: isNowMinimized });
  });

  widget.addEventListener('dblclick', () => {
    if (widget.classList.contains('collapsed')) {
      chrome.storage.local.set({ isMinimized: false });
    }
  });

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.storage.local.set({ showOverlay: false });
  });

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
    // Allow dragging from anywhere except the close button
    if (e.target.closest('#latency-close-btn')) return;
    
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    isDragging = true;
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
          processPing(null, null);
        } else {
          processPing(response.status === "online" ? response.latency : null, response.ispLatency);
        }
      });
    } catch (e) {
      // Catch "Extension context invalidated"
      if (window.latencyInterval) clearInterval(window.latencyInterval);
    }
  }

  function processPing(latency, ispLatency) {
    // Re-check context before updating UI
    if (!chrome.runtime?.id) return;
    
    history.push(latency);
    if (history.length > MAX_HISTORY) history.shift();

    if (latency !== null) {
      latencyNum.textContent = latency;
      minimizedInfo.textContent = latency + 'ms';
      const colorClass = (latency < 100 ? 'text-green' : latency < 300 ? 'text-yellow' : 'text-red');
      latencyNum.className = 'latency-num ' + colorClass;
      minimizedInfo.className = 'minimized-info ' + colorClass;
      statusText.innerHTML = '<span class="status-indicator online"></span>Online';
    } else {
      latencyNum.textContent = '!!!';
      minimizedInfo.textContent = '!!!';
      latencyNum.className = 'latency-num text-red';
      minimizedInfo.className = 'minimized-info text-red';
      statusText.innerHTML = '<span class="status-indicator offline"></span>Offline';
    }

    if (ispLatency) {
      ispVal.textContent = ispLatency + 'ms';
      ispVal.className = 'stat-value ' + (ispLatency < 60 ? 'text-green' : ispLatency < 150 ? 'text-yellow' : 'text-red');
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
