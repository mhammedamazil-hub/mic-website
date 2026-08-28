# Web Mic 🎙️

> **Live, zero-latency microphone passthrough Progressive Web App (PWA) for Bluetooth speakers and audio outputs.**
> 100% Client-Side • Zero Cloud Servers • Zero Audio Uploads • Offline Capable

---

## 📖 Overview

**Web Mic** transforms your smartphone, tablet, or laptop into a live wireless microphone. Audio captured by your device's built-in microphone (or external connected mic) is routed directly through your browser's Web Audio pipeline to a connected speaker (such as a Bluetooth speaker, PA system, or soundbar) with the lowest practical latency.

```text
┌──────────────┐      ┌─────────────────────────┐      ┌─────────────────────┐
│  Microphone  │ ───► │ Web Mic (Local Browser) │ ───► │  Bluetooth Speaker  │
│  (User Voice)│      │  Web Audio API Pipeline │      │  (PA / Audio Output)│
└──────────────┘      └─────────────────────────┘      └─────────────────────┘
                                  │
                       No Server • 100% Local
```

---

## ✨ Features

- **⚡ Ultra-Low Latency Pipeline**: Built with the native Web Audio API using `latencyHint: "interactive"`, minimal buffer stages, and mono routing for immediate responsiveness.
- **🔊 Bluetooth Speaker Ready**: Seamlessly works with ordinary Bluetooth speakers, PA systems, soundbars, or headphones connected via standard operating system settings.
- **🔒 100% Client-Side Privacy**: All audio processing occurs purely in device memory. Microphone streams are **never** uploaded, recorded, stored, or transmitted over any network.
- **🎛️ Real-Time Studio VU Meter & Oscilloscope**: High-precision LED VU meter (-60 dB to +6 dB scale), peak hold needle, clip indicator, and real-time audio waveform oscilloscope.
- **🎚️ Live Gain & Volume Boost**: Smooth digital volume slider (0% to 200% / +6 dB) with anti-pop interpolation and instant quick mute.
- **⚡ Latency Modes**:
  - **Low Latency (Default)**: Direct passthrough with zero browser DSP filters for minimal delay.
  - **Voice Clarity**: Light speech enhancement, noise suppression, and high-pass rumble filter.
- **📱 Installable PWA**: Standalone app experience on iOS, Android, macOS, Windows, and Linux. Works offline after the first visit.
- **💡 Screen Wake Lock**: Keeps the device screen awake during live broadcasting to prevent mobile operating systems from sleeping and interrupting audio.
- **📢 Acoustic Feedback Guard**: Feedback prevention tips, rumble cut filters, and optional Echo Cancellation (AEC).
- **🌐 GitHub Pages Compatible**: Built with 100% static vanilla HTML5, CSS3, and modern JavaScript with relative asset paths.

---

## 🚀 How It Works (Bluetooth Speaker Workflow)

Do not attempt to pair Bluetooth devices directly inside web browsers (browsers lack direct Bluetooth A2DP audio pairing APIs for security). Instead, follow the standard workflow:

```text
1. Connect Bluetooth Speaker
   ↳ Open your phone or laptop's Settings → Bluetooth and pair your speaker.

2. Open Web Mic
   ↳ Navigate to Web Mic in your browser or launch the installed PWA.

3. Grant Microphone Permission
   ↳ Tap "Start Microphone" and select "Allow" when prompted by your browser.

4. Select Output Device (where supported)
   ↳ If your browser supports output selection (e.g. Chrome/Edge), choose your speaker.
   ↳ On iOS/Safari/Firefox, your system automatically routes audio to the connected Bluetooth device.

5. Prevent Feedback & Speak
   ↳ Keep your phone at a safe distance from the speaker, adjust volume, and speak!
```

---

## ⚡ Latency Considerations & Technical Architecture

Latency is the single most critical factor in live microphone passthrough. To understand how latency works in Web Mic:

### 1. Browser Web Audio Pipeline Latency (~5ms – 15ms)
Web Mic optimizes every single step within software control:
- Uses `latencyHint: 'interactive'` on `AudioContext`.
- Captures mono audio at device hardware sample rate (typically 48 kHz).
- Disables automatic gain control and heavy acoustic echo cancellation by default in **Low Latency** mode.
- Uses a direct Web Audio node graph:
  $$\text{MediaStreamSourceNode} \longrightarrow \text{BiquadFilter (80Hz Highpass)} \longrightarrow \text{GainNode} \longrightarrow \text{AnalyserNode} \longrightarrow \text{Destination}$$

### 2. Bluetooth Hardware & Codec Latency (~100ms – 220ms)
Standard Bluetooth audio uses codecs such as **SBC** or **AAC** operating under the Bluetooth **A2DP** profile. These codecs enforce internal hardware buffering of roughly 100ms to 200ms to prevent wireless packet loss and audio stuttering.

| Audio Connection Type | Typical Hardware Latency | Web Mic Software Latency | Total Perceived Latency |
|:---|:---|:---|:---|
| **3.5mm AUX Cable / USB-C Audio** | < 1 ms | ~5 – 10 ms | **~6 – 11 ms (Zero Delay)** |
| **aptX Low Latency (aptX-LL)** | ~30 – 40 ms | ~5 – 10 ms | **~35 – 50 ms (Near Instant)** |
| **Standard Bluetooth (AAC / SBC)**| ~120 – 200 ms | ~5 – 10 ms | **~130 – 210 ms (Standard)** |

> **Pro Tip for Live Singing / Speeches**: If you require instant zero-latency monitoring, connect your phone to the speaker or mixer using a physical **3.5mm AUX audio cable** or USB-C audio adapter.

---

## 🛡️ Privacy Guarantee

Web Mic is designed with a strict **privacy-first** architecture:

- **No Audio Uploads**: Microphone streams exist solely in your device's RAM and are never transmitted to any external server.
- **No Audio Recording**: The application contains no recording, caching, or persistence mechanisms for audio data.
- **No Backend Server**: There is no application server, API, or database.
- **No User Tracking**: Zero cookies, zero analytics scripts, zero ads, and zero telemetry.

---

## 🌐 Browser Compatibility

| Platform / Browser | Microphone Passthrough | Real-Time VU Meter | Output Device Selection (`setSinkId`) | PWA Installation |
|:---|:---:|:---:|:---:|:---:|
| **Google Chrome (Desktop & Android)** | ✅ Yes | ✅ Yes | ✅ Yes (Full support) | ✅ Yes |
| **Microsoft Edge (Desktop & Android)** | ✅ Yes | ✅ Yes | ✅ Yes (Full support) | ✅ Yes |
| **Safari / iOS (iPhone & iPad)** | ✅ Yes | ✅ Yes | ⚠️ System Default Output | ✅ Yes (Add to Home Screen) |
| **Mozilla Firefox (Desktop & Android)** | ✅ Yes | ✅ Yes | ⚠️ System Default Output | ✅ Yes |
| **Samsung Internet** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

*Note for iOS & Safari users: iOS does not currently expose output switching APIs to web applications. Audio is routed to your Bluetooth speaker automatically via iOS Control Center.*

---

## 💻 Local Development

Web Mic is built with zero build tools or dependencies. You can run it with any static web server:

### Option 1: Python 3
```bash
# Clone the repository
git clone https://github.com/mhammedamazil-hub/mic-website.git
cd mic-website

# Start local server on port 8080
python3 -m http.server 8080 --bind 0.0.0.0
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

### Option 2: Node.js `npx serve` or `http-server`
```bash
npx serve .
```

### Option 3: VS Code Live Server
Open the folder in Visual Studio Code and click **Go Live** with the Live Server extension.

---

## 🚀 Deployment to GitHub Pages

Web Mic is designed to work seamlessly on GitHub Pages under custom subpaths (e.g. `https://<username>.github.io/<repository-name>/`) because all asset references, stylesheets, service worker registrations, and manifest URLs use strict relative paths (`./`).

### Step-by-Step GitHub Pages Setup:

1. Push the code to your GitHub repository:
   ```bash
   git add .
   git commit -m "Deploy Web Mic PWA"
   git push origin main
   ```
2. Navigate to your repository on GitHub.
3. Click **Settings** → **Pages** (under the "Code and automation" sidebar).
4. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`.
   - **Branch**: Select `main` (or your default branch) and `/ (root)`.
5. Click **Save**.
6. GitHub will deploy your site in ~1 minute at `https://<your-username>.github.io/<repo-name>/`.
7. Microphone access will work immediately because GitHub Pages provides HTTPS out of the box.

---

## 📱 How to Install the PWA

### On Android (Chrome / Edge / Samsung Internet):
1. Open Web Mic in your browser.
2. Tap the **Install App** button in the top navigation bar (or tap browser menu `⋮` → **Install app** / **Add to Home screen**).
3. The Web Mic icon will appear on your home screen and app drawer.

### On iOS (iPhone & iPad - Safari):
1. Open Web Mic in Safari.
2. Tap the **Share** button (the square with an arrow pointing upward at the bottom of Safari).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**. Web Mic will launch in fullscreen standalone mode.

---

## ⚠️ Troubleshooting & FAQ

### Q: Why do I hear a loud whistling/screeching noise (audio feedback)?
**A:** This is acoustic feedback. It occurs when sound from the speaker travels back into the microphone, creating an amplifying loop.
- Move further away from the speaker (at least 6–10 feet).
- Point the microphone away from the front of the speaker.
- Lower the microphone volume slider to 80%–100%.
- Turn on **Echo Cancellation (AEC)** in the *Advanced Audio Processing* settings.

### Q: Why isn't sound coming out of my Bluetooth speaker?
**A:** Check the following:
1. Ensure the speaker is paired and actively connected in your device's Bluetooth settings.
2. If using Chrome or Edge, check the **Speaker Output** dropdown in Web Mic and select your speaker.
3. If using iPhone / Safari, open the iOS Control Center, tap the AirPlay/Audio card in the top right, and ensure your Bluetooth speaker has the checkmark.
4. Press the **Test Sound** button in Web Mic to test the output chime.

### Q: Microphone permission was denied. How do I fix it?
**A:**
- **Chrome / Edge (Desktop & Android)**: Click the **tune/lock icon** on the left side of the address bar → set Microphone to **Allow** → refresh the page.
- **Safari (iOS)**: Open iOS Settings → **Safari** → **Microphone** → set to **Ask** or **Allow**.
- **Firefox**: Click the microphone icon next to the URL bar → clear blocked permissions → refresh.

### Q: Audio stops when my phone screen turns off.
**A:** Mobile operating systems throttle background audio tabs to save battery. Press the **Stay Awake** button in Web Mic, which uses the Screen Wake Lock API to prevent the screen from dimming while you are speaking.

---

## 📁 Project Structure

```text
mic-website/
├── index.html                  # HTML5 PWA Shell & Semantic Audio Interface
├── styles.css                  # Studio Dark Theme & Responsive UI
├── app.js                      # Web Audio Engine, Analyser & PWA Logic
├── manifest.json               # Web App Manifest for PWA installation
├── sw.js                       # Service Worker for Offline App Caching
├── generate_icons.py           # Icon Generation Script
├── generate_screenshots.py     # Screenshot Preview Generator
├── README.md                   # Complete Documentation
├── icons/                      # PWA Icon Assets
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-192-maskable.png
│   ├── icon-512-maskable.png
│   ├── apple-touch-icon.png
│   ├── favicon.ico
│   └── icon.svg
└── screenshots/                # PWA Store & Docs Screenshots
    ├── screenshot-desktop.png
    └── screenshot-mobile.png
```

---

## 📄 License

MIT License • Free and open source for personal and commercial use.
