# 🌐 Live Site Latency Tracker

A premium, interactive Chrome extension that continuously monitors your connection speed to the websites you visit. Stay informed about your internet health with real-time graphs, jitter analysis, and ISP health tracking.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

## ✨ Features

- **🚀 Real-time Floating Widget**: A sleek, glassmorphism-style overlay that follows you across websites.
- **📊 Historical Latency Graph**: Visualizes the last 60 seconds of your connection stability.
- **⚡ ISP Health Tracking**: Dual-ping technology that compares site performance against global edge servers (Cloudflare) to determine if lag is site-specific or ISP-wide.
- **🛡️ Compact Mode**: Collapse the widget into a minimal pill display with a single click (or double-click to expand).
- **🖱️ Draggable Interface**: Place the widget anywhere on your screen; it remembers its visibility settings across sessions.
- **🎨 Dynamic Aesthetics**: Colors change dynamically based on latency (Green < 100ms, Yellow < 300ms, Red > 300ms).

## 📸 Screenshots

*(Add screenshots here)*

## 🛠️ Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yanki5599/internet-connectivity-extension.git
    ```
2.  **Open Chrome Extensions**:
    - Navigate to `chrome://extensions/` in your browser.
3.  **Enable Developer Mode**:
    - Toggle the switch in the top-right corner.
4.  **Load Unpacked**:
    - Click "Load unpacked" and select the `chrome_site_latency` folder from this project.

## ⚙️ How it Works

- **Site Ping**: The background service worker performs `HEAD` requests to the current tab's origin to measure real-world site latency.
- **ISP Ping**: Pings `1.1.1.1/cdn-cgi/trace` to establish a baseline for your local internet connection quality.
- **Storage**: Uses `chrome.storage.local` to persist your preferences for widget visibility and minimized states.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yanki5599/internet-connectivity-extension/issues).

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Created with ❤️ by **Yaakov Gottlib**
