async function ping(url) {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    await fetch(url, { 
      method: 'HEAD', 
      mode: 'no-cors', 
      cache: 'no-store',
      signal: controller.signal 
    });
    clearTimeout(id);
    return Math.round(performance.now() - start);
  } catch (e) {
    return null;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "measureLatency") {
    Promise.all([
      ping(request.url),
      ping("https://1.1.1.1/cdn-cgi/trace") 
    ]).then(([siteLat, ispLat]) => {
      sendResponse({ 
        status: siteLat !== null ? "online" : "offline", 
        latency: siteLat,
        ispLatency: ispLat
      });
    });
    return true; 
  }
});
