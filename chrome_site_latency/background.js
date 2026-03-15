chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "measureLatency") {
    const url = request.url;
    const start = performance.now();

    fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store'
    })
    .then(() => {
      const end = performance.now();
      const latency = Math.round(end - start);
      sendResponse({ status: "online", latency: latency });
    })
    .catch((error) => {
      console.error("Latency check failed:", error);
      sendResponse({ status: "offline", latency: null });
    });

    return true; // Keep the message channel open for async response
  }
});
