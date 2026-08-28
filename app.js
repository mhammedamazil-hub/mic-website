/**
 * Web Mic - Live Wireless Microphone Passthrough PWA
 * Core Application Engine
 */

'use strict';

// ==========================================================================
// Application State
// ==========================================================================
const state = {
  isRunning: false,
  isMuted: false,
  isWakeLockActive: false,
  selectedMicId: 'default',
  selectedOutputId: 'default',
  gainValue: 1.0, // 100% (0 dB)
  latencyMode: 'low-latency', // 'low-latency' | 'voice-clarity'
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  highPassFilter: true,
  visMode: 'bars', // 'bars' | 'wave' | 'both'
  peakLevel: -60,
  isClipping: false,
  supportsSetSinkId: false,
  hasShownPermissionPrePrompt: false
};

// Web Audio Pipeline References
let audioCtx = null;
let mediaStream = null;
let sourceNode = null;
let highPassFilterNode = null;
let gainNode = null;
let analyserNode = null;
let streamDestinationNode = null;
let outputAudioEl = null;

// Visualizer & Animation References
let animFrameId = null;
let peakHoldTimer = null;
let clipClearTimer = null;
let deferredInstallPrompt = null;
let wakeLockSentinel = null;

// DOM Element Selectors
const DOM = {
  headerLiveDot: document.getElementById('headerLiveDot'),
  installAppBtn: document.getElementById('installAppBtn'),
  btnOpenGuide: document.getElementById('btnOpenGuide'),
  btnOpenPrivacy: document.getElementById('btnOpenPrivacy'),
  offlineBanner: document.getElementById('offlineBanner'),
  btnFeedbackTips: document.getElementById('btnFeedbackTips'),

  // Mic Button Stage
  toggleMicBtn: document.getElementById('toggleMicBtn'),
  micBtnStage: document.querySelector('.mic-button-stage'),
  pulseAura: document.getElementById('pulseAura'),
  micBtnLabel: document.getElementById('micBtnLabel'),
  micBtnSublabel: document.getElementById('micBtnSublabel'),
  micIconSvg: document.getElementById('micIconSvg'),

  // Visualizer & VU Meter
  liveDotIndicator: document.getElementById('liveDotIndicator'),
  meterLabel: document.getElementById('meterLabel'),
  clipIndicator: document.getElementById('clipIndicator'),
  btnVisBars: document.getElementById('btnVisBars'),
  btnVisWave: document.getElementById('btnVisWave'),
  btnVisBoth: document.getElementById('btnVisBoth'),
  vuMeterContainer: document.getElementById('vuMeterContainer'),
  vuMeterAria: document.getElementById('vuMeterAria'),
  vuMeterFill: document.getElementById('vuMeterFill'),
  vuPeakNeedle: document.getElementById('vuPeakNeedle'),
  dbLevelText: document.getElementById('dbLevelText'),
  peakLevelText: document.getElementById('peakLevelText'),
  oscilloscopeContainer: document.getElementById('oscilloscopeContainer'),
  oscilloscopeCanvas: document.getElementById('oscilloscopeCanvas'),

  // Quick Controls
  toggleMuteBtn: document.getElementById('toggleMuteBtn'),
  muteBtnText: document.getElementById('muteBtnText'),
  muteIcon: document.getElementById('muteIcon'),
  testSpeakerBtn: document.getElementById('testSpeakerBtn'),
  toggleWakeLockBtn: document.getElementById('toggleWakeLockBtn'),
  wakeLockBtnText: document.getElementById('wakeLockBtnText'),

  // Volume & Gain
  gainSlider: document.getElementById('gainSlider'),
  gainValueDisplay: document.getElementById('gainValueDisplay'),
  btnResetGain: document.getElementById('btnResetGain'),
  btnVolumeDown: document.getElementById('btnVolumeDown'),
  btnVolumeUp: document.getElementById('btnVolumeUp'),

  // Latency Mode
  btnModeLowLatency: document.getElementById('btnModeLowLatency'),
  btnModeVoiceClarity: document.getElementById('btnModeVoiceClarity'),
  currentLatencyBadge: document.getElementById('currentLatencyBadge'),

  // Status Cards
  statusMicText: document.getElementById('statusMicText'),
  statusMicDetail: document.getElementById('statusMicDetail'),
  statusOutputText: document.getElementById('statusOutputText'),
  statusOutputDetail: document.getElementById('statusOutputDetail'),
  statusLatencyText: document.getElementById('statusLatencyText'),
  statusSampleRateText: document.getElementById('statusSampleRateText'),

  // Device Selectors
  micSelect: document.getElementById('micSelect'),
  micSelectHint: document.getElementById('micSelectHint'),
  outputSelect: document.getElementById('outputSelect'),
  outputSelectHint: document.getElementById('outputSelectHint'),
  outputSupportBadge: document.getElementById('outputSupportBadge'),
  outputUnsupportedNotice: document.getElementById('outputUnsupportedNotice'),
  btnRefreshDevices: document.getElementById('btnRefreshDevices'),

  // Advanced Processing Toggles
  chkEchoCancellation: document.getElementById('chkEchoCancellation'),
  chkNoiseSuppression: document.getElementById('chkNoiseSuppression'),
  chkAutoGain: document.getElementById('chkAutoGain'),
  chkHighPass: document.getElementById('chkHighPass'),

  // Diagnostics
  diagCtxState: document.getElementById('diagCtxState'),
  diagSampleRate: document.getElementById('diagSampleRate'),
  diagBaseLatency: document.getElementById('diagBaseLatency'),
  diagOutputLatency: document.getElementById('diagOutputLatency'),
  diagEngine: document.getElementById('diagEngine'),

  // Modals
  guideModal: document.getElementById('guideModal'),
  btnCloseGuideModal: document.getElementById('btnCloseGuideModal'),
  btnCloseGuideModalBtn: document.getElementById('btnCloseGuideModalBtn'),
  btnFooterGuide: document.getElementById('btnFooterGuide'),

  feedbackModal: document.getElementById('feedbackModal'),
  btnCloseFeedbackModal: document.getElementById('btnCloseFeedbackModal'),
  btnCloseFeedbackModalBtn: document.getElementById('btnCloseFeedbackModalBtn'),

  privacyModal: document.getElementById('privacyModal'),
  btnClosePrivacyModal: document.getElementById('btnClosePrivacyModal'),
  btnClosePrivacyModalBtn: document.getElementById('btnClosePrivacyModalBtn'),
  btnFooterPrivacy: document.getElementById('btnFooterPrivacy'),

  permissionModal: document.getElementById('permissionModal'),
  btnClosePermissionModal: document.getElementById('btnClosePermissionModal'),
  btnCancelPermissionModal: document.getElementById('btnCancelPermissionModal'),
  btnGrantPermissionModal: document.getElementById('btnGrantPermissionModal'),

  toastContainer: document.getElementById('toastContainer')
};

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  detectBrowserFeatures();
  registerServiceWorker();
  initEventListeners();
  updateGainDisplay(state.gainValue);
  updateDiagnostics();
  refreshAudioDevices();

  // Handle online/offline network indicators
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  // Listen for audio device changes (Bluetooth speaker plugged/connected)
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', () => {
      showToast('Audio devices updated', 'info');
      refreshAudioDevices();
    });
  }
});

// ==========================================================================
// Feature Detection
// ==========================================================================
function detectBrowserFeatures() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    showToast('Your browser does not support the Web Audio API.', 'error');
    DOM.statusMicText.textContent = 'Unsupported Browser';
    DOM.statusMicDetail.textContent = 'AudioContext is missing';
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Microphone access (getUserMedia) is not supported in this browser.', 'error');
    DOM.statusMicText.textContent = 'Microphone Unsupported';
  }

  // Check audio output selection support (setSinkId)
  const hasAudioCtxSetSinkId = AudioContextClass && 'setSinkId' in AudioContextClass.prototype;
  const hasMediaElementSetSinkId = 'HTMLMediaElement' in window && 'setSinkId' in HTMLMediaElement.prototype;
  state.supportsSetSinkId = hasAudioCtxSetSinkId || hasMediaElementSetSinkId;

  if (state.supportsSetSinkId) {
    DOM.outputSupportBadge.textContent = 'Supported';
    DOM.outputSupportBadge.className = 'badge badge-supported';
    DOM.outputUnsupportedNotice.classList.add('hidden');
    DOM.outputSelectHint.textContent = 'Select your Bluetooth speaker or external output device.';
  } else {
    DOM.outputSupportBadge.textContent = 'System Default Only';
    DOM.outputSupportBadge.className = 'badge badge-unsupported';
    DOM.outputUnsupportedNotice.classList.remove('hidden');
    DOM.outputSelectHint.textContent = 'Use your system Bluetooth settings to set the default output.';
  }
}

// ==========================================================================
// Service Worker & PWA Installation
// ==========================================================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then((reg) => {
          console.log('[Web Mic] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[Web Mic] Service Worker registration failed:', err);
        });
    });
  }

  // PWA Install Prompt handling
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    DOM.installAppBtn.classList.remove('hidden');
  });

  DOM.installAppBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      showToast('To install, use your browser menu and tap "Add to Home Screen".', 'info');
      return;
    }
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log(`[Web Mic] PWA install choice: ${outcome}`);
    deferredInstallPrompt = null;
    DOM.installAppBtn.classList.add('hidden');
  });

  window.addEventListener('appinstalled', () => {
    DOM.installAppBtn.classList.add('hidden');
    showToast('Web Mic installed successfully!', 'success');
  });
}

function updateNetworkStatus() {
  if (navigator.onLine) {
    DOM.offlineBanner.classList.add('hidden');
  } else {
    DOM.offlineBanner.classList.remove('hidden');
  }
}

// ==========================================================================
// Audio Pipeline Setup & Control
// ==========================================================================
async function startMicrophone() {
  try {
    // If we haven't shown pre-prompt and permissions aren't queryable, open pre-prompt modal
    if (!state.hasShownPermissionPrePrompt && navigator.permissions) {
      try {
        const permStatus = await navigator.permissions.query({ name: 'microphone' });
        if (permStatus.state === 'prompt') {
          openModal(DOM.permissionModal);
          return;
        }
      } catch {
        // Permissions query not supported for microphone on some mobile browsers; proceed
      }
    }

    setUIState('initializing');

    // 1. Initialize AudioContext with interactive latency hint
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass({
        latencyHint: 'interactive'
      });
    }

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    // 2. Build getUserMedia constraints based on current latency mode & settings
    const isVoiceClarity = state.latencyMode === 'voice-clarity';
    const audioConstraints = {
      echoCancellation: isVoiceClarity ? state.echoCancellation : false,
      noiseSuppression: isVoiceClarity ? state.noiseSuppression : false,
      autoGainControl: isVoiceClarity ? state.autoGainControl : false,
      channelCount: 1,
      latency: 0
    };

    if (state.selectedMicId && state.selectedMicId !== 'default') {
      audioConstraints.deviceId = { exact: state.selectedMicId };
    }

    console.log('[Web Mic] Requesting getUserMedia with constraints:', audioConstraints);

    // 3. Request microphone access
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video: false
    });

    // 4. Create Web Audio Nodes
    sourceNode = audioCtx.createMediaStreamSource(mediaStream);

    // High-Pass filter (80Hz Butterworth rumble cut)
    highPassFilterNode = audioCtx.createBiquadFilter();
    highPassFilterNode.type = 'highpass';
    highPassFilterNode.frequency.setValueAtTime(80, audioCtx.currentTime);
    highPassFilterNode.Q.setValueAtTime(0.707, audioCtx.currentTime);

    // Master Gain Node for volume control and smooth muting
    gainNode = audioCtx.createGain();
    const currentGain = state.isMuted ? 0 : state.gainValue;
    gainNode.gain.setValueAtTime(currentGain, audioCtx.currentTime);

    // Real-Time Analyser Node for VU Meter and Oscilloscope
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 512;
    analyserNode.smoothingTimeConstant = 0.2; // Quick, snappy response

    // 5. Connect Audio Node Graph
    // source -> (highPassFilter if active) -> gainNode -> analyserNode -> destination
    if (state.highPassFilter) {
      sourceNode.connect(highPassFilterNode);
      highPassFilterNode.connect(gainNode);
    } else {
      sourceNode.connect(gainNode);
    }

    gainNode.connect(analyserNode);

    // 6. Connect to Output Destination
    await connectAudioOutput();

    // 7. Acquire Screen Wake Lock to prevent phone sleeping during mic use
    acquireWakeLock();

    // 8. Start visualizer rendering loop
    startVisualizerLoop();

    // 9. Update state & UI
    state.isRunning = true;
    setUIState('active');
    updateDiagnostics();
    refreshAudioDevices(); // Refresh labels now that permission is granted

    showToast('Microphone live — audio playing to speaker', 'success');

  } catch (err) {
    console.error('[Web Mic] Error starting microphone:', err);
    handleMicrophoneError(err);
  }
}

async function connectAudioOutput() {
  if (!audioCtx || !gainNode) return;

  const targetSinkId = state.selectedOutputId;

  // Modern AudioContext.setSinkId (Chrome 110+, Edge)
  if ('setSinkId' in audioCtx && typeof audioCtx.setSinkId === 'function') {
    try {
      if (targetSinkId && targetSinkId !== 'default') {
        await audioCtx.setSinkId(targetSinkId);
      } else {
        await audioCtx.setSinkId('');
      }
      analyserNode.connect(audioCtx.destination);
      DOM.diagEngine.textContent = 'AudioContext setSinkId';
      return;
    } catch (err) {
      console.warn('[Web Mic] AudioContext.setSinkId failed, falling back:', err);
    }
  }

  // Fallback: HTMLMediaElement.setSinkId
  if ('setSinkId' in HTMLMediaElement.prototype && targetSinkId && targetSinkId !== 'default') {
    try {
      if (!outputAudioEl) {
        outputAudioEl = new Audio();
        outputAudioEl.autoplay = true;
        outputAudioEl.muted = false;
        outputAudioEl.setAttribute('playsinline', '');
      }

      streamDestinationNode = audioCtx.createMediaStreamDestination();
      analyserNode.connect(streamDestinationNode);
      outputAudioEl.srcObject = streamDestinationNode.stream;
      await outputAudioEl.setSinkId(targetSinkId);
      await outputAudioEl.play();
      DOM.diagEngine.textContent = 'HTMLAudioElement setSinkId';
      return;
    } catch (err) {
      console.warn('[Web Mic] HTMLMediaElement.setSinkId failed:', err);
    }
  }

  // Standard Direct Destination (Routes to default system output / active Bluetooth speaker)
  analyserNode.connect(audioCtx.destination);
  DOM.diagEngine.textContent = 'System Default Output Graph';
}

function stopMicrophone() {
  if (!state.isRunning) return;

  // 1. Stop all tracks in the MediaStream to release microphone hardware immediately
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => {
      track.stop();
      console.log('[Web Mic] Track stopped:', track.label);
    });
    mediaStream = null;
  }

  // 2. Disconnect and release audio nodes
  if (sourceNode) {
    try { sourceNode.disconnect(); } catch {}
    sourceNode = null;
  }
  if (highPassFilterNode) {
    try { highPassFilterNode.disconnect(); } catch {}
    highPassFilterNode = null;
  }
  if (gainNode) {
    try { gainNode.disconnect(); } catch {}
    gainNode = null;
  }
  if (analyserNode) {
    try { analyserNode.disconnect(); } catch {}
    analyserNode = null;
  }
  if (streamDestinationNode) {
    try { streamDestinationNode.disconnect(); } catch {}
    streamDestinationNode = null;
  }
  if (outputAudioEl) {
    try {
      outputAudioEl.pause();
      outputAudioEl.srcObject = null;
    } catch {}
  }

  // 3. Stop visualizer animation loop & reset meters
  stopVisualizerLoop();
  resetMeterUI();

  // 4. Release screen wake lock
  releaseWakeLock();

  // 5. Update state & UI
  state.isRunning = false;
  setUIState('ready');
  updateDiagnostics();

  showToast('Microphone stopped', 'info');
}

function handleMicrophoneError(err) {
  stopMicrophone();

  let message = 'Failed to access microphone.';
  let detail = err.message || '';

  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    message = 'Microphone access was denied.';
    detail = 'Please allow microphone permissions in your browser settings (click the lock icon in the address bar).';
  } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    message = 'No microphone device found.';
    detail = 'Please connect a microphone or headset and try again.';
  } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
    message = 'Microphone is currently in use.';
    detail = 'Another application is using your microphone. Please close other audio apps and try again.';
  } else if (err.name === 'OverconstrainedError') {
    message = 'Selected microphone constraints are unsupported.';
    detail = 'Switching to default device microphone.';
    state.selectedMicId = 'default';
    DOM.micSelect.value = 'default';
  } else if (err.name === 'SecurityError') {
    message = 'Microphone requires a secure connection (HTTPS).';
    detail = 'Please ensure you are loading this app via HTTPS or localhost.';
  }

  DOM.statusMicText.textContent = 'Microphone Blocked / Error';
  DOM.statusMicDetail.textContent = err.name || 'Error';
  showToast(`${message} ${detail}`, 'error', 6000);
}

// ==========================================================================
// Mute & Volume / Gain Controls
// ==========================================================================
function toggleMute() {
  if (!state.isRunning) return;

  state.isMuted = !state.isMuted;
  const targetGain = state.isMuted ? 0 : state.gainValue;

  if (gainNode && audioCtx) {
    // Smooth ramp to prevent clicking artifacts
    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.015);
  }

  if (state.isMuted) {
    DOM.toggleMuteBtn.classList.add('active');
    DOM.toggleMuteBtn.setAttribute('aria-pressed', 'true');
    DOM.muteBtnText.textContent = 'Unmute';
    DOM.toggleMicBtn.classList.add('is-muted');
    DOM.liveDotIndicator.className = 'live-dot muted';
    DOM.headerLiveDot.style.backgroundColor = 'var(--accent-rose)';
    DOM.statusMicText.textContent = 'Muted';
    DOM.statusMicDetail.textContent = 'Audio passthrough paused';
    showToast('Microphone Muted', 'warning');
  } else {
    DOM.toggleMuteBtn.classList.remove('active');
    DOM.toggleMuteBtn.setAttribute('aria-pressed', 'false');
    DOM.muteBtnText.textContent = 'Mute';
    DOM.toggleMicBtn.classList.remove('is-muted');
    DOM.liveDotIndicator.className = 'live-dot live';
    DOM.headerLiveDot.style.backgroundColor = 'var(--accent-emerald)';
    DOM.statusMicText.textContent = 'Broadcasting Live';
    DOM.statusMicDetail.textContent = 'Passthrough active';
    showToast('Microphone Unmuted', 'info');
  }
}

function setGain(val) {
  const clamped = Math.max(0, Math.min(2.0, parseFloat(val)));
  state.gainValue = clamped;
  DOM.gainSlider.value = clamped;

  if (gainNode && audioCtx && !state.isMuted) {
    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setTargetAtTime(clamped, audioCtx.currentTime, 0.01);
  }

  updateGainDisplay(clamped);
}

function updateGainDisplay(gain) {
  const percent = Math.round(gain * 100);
  let dbText = '0.0 dB';
  if (gain === 0) {
    dbText = '-∞ dB';
  } else {
    const db = 20 * Math.log10(gain);
    dbText = `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
  }

  DOM.gainValueDisplay.textContent = `${percent}% (${dbText})`;
  DOM.gainSlider.setAttribute('aria-valuenow', percent);
}

// ==========================================================================
// Test Speaker Chime
// ==========================================================================
async function playSpeakerTestSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const testCtx = new AudioContextClass({ latencyHint: 'interactive' });
    if (testCtx.state === 'suspended') {
      await testCtx.resume();
    }

    const osc1 = testCtx.createOscillator();
    const osc2 = testCtx.createOscillator();
    const chimeGain = testCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, testCtx.currentTime); // C5
    osc1.frequency.setValueAtTime(659.25, testCtx.currentTime + 0.15); // E5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1046.50, testCtx.currentTime); // C6
    osc2.frequency.setValueAtTime(1318.51, testCtx.currentTime + 0.15); // E6

    chimeGain.gain.setValueAtTime(0.001, testCtx.currentTime);
    chimeGain.gain.exponentialRampToValueAtTime(0.25, testCtx.currentTime + 0.05);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, testCtx.currentTime + 0.45);

    osc1.connect(chimeGain);
    osc2.connect(chimeGain);

    if (state.supportsSetSinkId && state.selectedOutputId && state.selectedOutputId !== 'default' && 'setSinkId' in testCtx) {
      try {
        await testCtx.setSinkId(state.selectedOutputId);
      } catch {}
    }

    chimeGain.connect(testCtx.destination);

    osc1.start(testCtx.currentTime);
    osc2.start(testCtx.currentTime);
    osc1.stop(testCtx.currentTime + 0.5);
    osc2.stop(testCtx.currentTime + 0.5);

    showToast('Testing speaker tone...', 'info');

    setTimeout(() => {
      try { testCtx.close(); } catch {}
    }, 600);
  } catch (err) {
    console.warn('[Web Mic] Test tone error:', err);
    showToast('Could not play test tone: ' + err.message, 'error');
  }
}

// ==========================================================================
// Screen Wake Lock
// ==========================================================================
async function acquireWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      state.isWakeLockActive = true;
      updateWakeLockUI(true);

      wakeLockSentinel.addEventListener('release', () => {
        state.isWakeLockActive = false;
        updateWakeLockUI(false);
      });
    } catch (err) {
      console.warn('[Web Mic] Screen Wake Lock failed:', err);
    }
  }
}

function releaseWakeLock() {
  if (wakeLockSentinel) {
    try {
      wakeLockSentinel.release();
    } catch {}
    wakeLockSentinel = null;
  }
  state.isWakeLockActive = false;
  updateWakeLockUI(false);
}

function updateWakeLockUI(isActive) {
  if (isActive) {
    DOM.toggleWakeLockBtn.classList.add('active');
    DOM.toggleWakeLockBtn.setAttribute('aria-pressed', 'true');
    DOM.wakeLockBtnText.textContent = 'Awake ON';
  } else {
    DOM.toggleWakeLockBtn.classList.remove('active');
    DOM.toggleWakeLockBtn.setAttribute('aria-pressed', 'false');
    DOM.wakeLockBtnText.textContent = 'Stay Awake';
  }
}

// Re-acquire wake lock if page visibility changes back to visible while running
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.isRunning && !state.isWakeLockActive) {
    acquireWakeLock();
  }
});

// ==========================================================================
// Real-Time Visualizer & VU Meter Loop
// ==========================================================================
function startVisualizerLoop() {
  if (animFrameId) cancelAnimationFrame(animFrameId);

  const canvas = DOM.oscilloscopeCanvas;
  const ctx = canvas.getContext('2d');
  const bufferLength = analyserNode.frequencyBinCount;
  const timeDomainData = new Uint8Array(bufferLength);

  let lastPeakTime = Date.now();

  function render() {
    if (!state.isRunning || !analyserNode) return;

    analyserNode.getByteTimeDomainData(timeDomainData);

    // Calculate RMS & Peak
    let sumSquares = 0;
    let maxSample = 0;

    for (let i = 0; i < bufferLength; i++) {
      const normalized = (timeDomainData[i] - 128) / 128; // -1.0 to 1.0
      sumSquares += normalized * normalized;
      const absSample = Math.abs(normalized);
      if (absSample > maxSample) maxSample = absSample;
    }

    const rms = Math.sqrt(sumSquares / bufferLength);

    // Convert RMS to dB (-60 dB to +6 dB scale)
    let currentDb = -60;
    if (rms > 0.0001) {
      currentDb = 20 * Math.log10(rms * state.gainValue);
    }
    currentDb = Math.max(-60, Math.min(6, currentDb));

    // Peak hold decay calculation
    const now = Date.now();
    if (currentDb > state.peakLevel) {
      state.peakLevel = currentDb;
      lastPeakTime = now;
    } else if (now - lastPeakTime > 400) {
      // Decay peak slowly after 400ms hold
      state.peakLevel = Math.max(-60, state.peakLevel - 0.75);
    }

    // Clip detection (>= -0.5 dB)
    if (currentDb >= -0.5 || maxSample * state.gainValue >= 0.98) {
      triggerClipIndicator();
    }

    // Update VU Meter Bar & Needle
    // Map -60dB -> 0%, 0dB -> 85%, +6dB -> 100%
    const meterPercent = dbToPercent(currentDb);
    const peakPercent = dbToPercent(state.peakLevel);

    DOM.vuMeterFill.style.width = `${meterPercent}%`;
    DOM.vuPeakNeedle.style.left = `${peakPercent}%`;
    DOM.vuMeterAria.setAttribute('aria-valuenow', currentDb.toFixed(1));

    // Update text labels
    DOM.dbLevelText.textContent = currentDb <= -59 ? '-∞ dB' : `${currentDb.toFixed(1)} dB`;
    DOM.peakLevelText.textContent = state.peakLevel <= -59 ? 'Peak: -∞ dB' : `Peak: ${state.peakLevel.toFixed(1)} dB`;

    // Dynamic aura scale with voice level
    const auraScale = 1.0 + Math.min(0.5, rms * 1.5 * state.gainValue);
    DOM.pulseAura.style.transform = `scale(${auraScale})`;

    // Render Oscilloscope if visible
    if (state.visMode === 'wave' || state.visMode === 'both') {
      renderOscilloscope(ctx, canvas, timeDomainData, bufferLength);
    }

    animFrameId = requestAnimationFrame(render);
  }

  animFrameId = requestAnimationFrame(render);
}

function dbToPercent(db) {
  if (db <= -60) return 0;
  if (db >= 6) return 100;
  // Non-linear perceptual mapping
  if (db < 0) {
    // -60dB to 0dB maps to 0% to 85%
    return ((db + 60) / 60) * 85;
  } else {
    // 0dB to +6dB maps to 85% to 100%
    return 85 + (db / 6) * 15;
  }
}

function renderOscilloscope(ctx, canvas, dataArray, bufferLength) {
  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = '#070A10';
  ctx.fillRect(0, 0, width, height);

  // Center reference zero-line
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  // Waveform glow path
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = state.isMuted ? '#F43F5E' : '#06B6D4';
  ctx.shadowBlur = 8;
  ctx.shadowColor = state.isMuted ? 'rgba(244, 63, 94, 0.8)' : 'rgba(6, 182, 212, 0.8)';

  ctx.beginPath();
  const sliceWidth = width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0; // 0 to 2
    const y = (v * height) / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  ctx.stroke();
  ctx.shadowBlur = 0; // reset
}

function triggerClipIndicator() {
  DOM.clipIndicator.classList.remove('hidden');
  if (clipClearTimer) clearTimeout(clipClearTimer);
  clipClearTimer = setTimeout(() => {
    DOM.clipIndicator.classList.add('hidden');
  }, 450);
}

function stopVisualizerLoop() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

function resetMeterUI() {
  DOM.vuMeterFill.style.width = '0%';
  DOM.vuPeakNeedle.style.left = '0%';
  DOM.dbLevelText.textContent = '-∞ dB';
  DOM.peakLevelText.textContent = 'Peak: -∞ dB';
  DOM.pulseAura.style.transform = 'scale(0.8)';
  state.peakLevel = -60;

  // Clear oscilloscope canvas
  const canvas = DOM.oscilloscopeCanvas;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#070A10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ==========================================================================
// Device Enumeration
// ==========================================================================
async function refreshAudioDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const micSelect = DOM.micSelect;
    const outputSelect = DOM.outputSelect;

    const currentMicVal = micSelect.value;
    const currentOutputVal = outputSelect.value;

    // Reset dropdowns
    micSelect.innerHTML = '<option value="default">Default Device Microphone</option>';
    outputSelect.innerHTML = '<option value="default">Default System Audio Output</option>';

    let micCount = 0;
    let outputCount = 0;

    devices.forEach((device) => {
      if (device.kind === 'audioinput') {
        micCount++;
        const opt = document.createElement('option');
        opt.value = device.deviceId;
        opt.textContent = device.label || `Microphone ${micCount}`;
        if (device.deviceId === currentMicVal) opt.selected = true;
        micSelect.appendChild(opt);
      } else if (device.kind === 'audiooutput') {
        outputCount++;
        const opt = document.createElement('option');
        opt.value = device.deviceId;
        opt.textContent = device.label || `Speaker / Output ${outputCount}`;
        if (device.deviceId === currentOutputVal) opt.selected = true;
        outputSelect.appendChild(opt);
      }
    });

    if (micCount > 0) {
      DOM.micSelectHint.textContent = `${micCount} microphone${micCount > 1 ? 's' : ''} detected.`;
    }

    if (outputCount > 0) {
      DOM.statusOutputText.textContent = outputSelect.options[outputSelect.selectedIndex].text;
    }
  } catch (err) {
    console.warn('[Web Mic] Could not enumerate devices:', err);
  }
}

// ==========================================================================
// UI State Updates
// ==========================================================================
function setUIState(appState) {
  switch (appState) {
    case 'initializing':
      DOM.toggleMicBtn.disabled = true;
      DOM.micBtnLabel.textContent = 'CONNECTING...';
      DOM.micBtnSublabel.textContent = 'Requesting audio stream';
      DOM.statusMicText.textContent = 'Initializing...';
      DOM.statusMicDetail.textContent = 'Requesting microphone permission';
      break;

    case 'active':
      DOM.toggleMicBtn.disabled = false;
      DOM.toggleMicBtn.classList.add('is-active');
      DOM.toggleMicBtn.setAttribute('aria-pressed', 'true');
      DOM.micBtnStage.classList.add('active');
      DOM.micBtnLabel.textContent = 'LIVE MICROPHONE';
      DOM.micBtnSublabel.textContent = 'Tap to Stop Microphone';
      DOM.headerLiveDot.style.display = 'block';
      DOM.headerLiveDot.style.backgroundColor = 'var(--accent-emerald)';
      DOM.liveDotIndicator.className = 'live-dot live';
      DOM.toggleMuteBtn.disabled = false;
      DOM.statusMicText.textContent = 'Broadcasting Live';
      DOM.statusMicDetail.textContent = DOM.micSelect.options[DOM.micSelect.selectedIndex].text;
      break;

    case 'ready':
    default:
      DOM.toggleMicBtn.disabled = false;
      DOM.toggleMicBtn.classList.remove('is-active', 'is-muted');
      DOM.toggleMicBtn.setAttribute('aria-pressed', 'false');
      DOM.micBtnStage.classList.remove('active');
      DOM.micBtnLabel.textContent = 'START MICROPHONE';
      DOM.micBtnSublabel.textContent = 'Tap to route audio to speaker';
      DOM.headerLiveDot.style.display = 'none';
      DOM.liveDotIndicator.className = 'live-dot';
      DOM.toggleMuteBtn.disabled = true;
      DOM.toggleMuteBtn.classList.remove('active');
      DOM.muteBtnText.textContent = 'Mute';
      DOM.statusMicText.textContent = 'Ready (Standby)';
      DOM.statusMicDetail.textContent = 'No active capture';
      break;
  }
}

function updateDiagnostics() {
  if (audioCtx) {
    DOM.diagCtxState.textContent = audioCtx.state;
    DOM.diagSampleRate.textContent = `${audioCtx.sampleRate} Hz`;
    DOM.statusSampleRateText.textContent = `${(audioCtx.sampleRate / 1000).toFixed(0)} kHz • Interactive`;

    const baseLat = audioCtx.baseLatency !== undefined ? `${(audioCtx.baseLatency * 1000).toFixed(1)} ms` : 'N/A';
    const outLat = audioCtx.outputLatency !== undefined ? `${(audioCtx.outputLatency * 1000).toFixed(1)} ms` : 'N/A';
    DOM.diagBaseLatency.textContent = baseLat;
    DOM.diagOutputLatency.textContent = outLat;

    if (audioCtx.baseLatency !== undefined) {
      DOM.statusLatencyText.textContent = `~${(audioCtx.baseLatency * 1000).toFixed(0)} ms (Ultra Low)`;
    }
  } else {
    DOM.diagCtxState.textContent = 'uninitialized';
    DOM.diagSampleRate.textContent = '48000 Hz (Expected)';
    DOM.diagBaseLatency.textContent = '~5.3 ms (Est.)';
    DOM.diagOutputLatency.textContent = '~10.0 ms (Est.)';
  }
}

// ==========================================================================
// Latency Mode & Processing Handlers
// ==========================================================================
function setLatencyMode(mode) {
  state.latencyMode = mode;

  if (mode === 'low-latency') {
    DOM.btnModeLowLatency.classList.add('active');
    DOM.btnModeLowLatency.setAttribute('aria-checked', 'true');
    DOM.btnModeVoiceClarity.classList.remove('active');
    DOM.btnModeVoiceClarity.setAttribute('aria-checked', 'false');
    DOM.currentLatencyBadge.textContent = 'Ultra Low Latency';
    DOM.currentLatencyBadge.className = 'badge badge-info';
    DOM.statusLatencyText.textContent = 'Interactive (~10ms)';

    // Reset processing toggles
    state.echoCancellation = false;
    state.noiseSuppression = false;
    state.autoGainControl = false;
    DOM.chkEchoCancellation.checked = false;
    DOM.chkNoiseSuppression.checked = false;
    DOM.chkAutoGain.checked = false;

    showToast('Switched to Ultra Low Latency Mode (all processing bypassed)', 'info');
  } else {
    DOM.btnModeVoiceClarity.classList.add('active');
    DOM.btnModeVoiceClarity.setAttribute('aria-checked', 'true');
    DOM.btnModeLowLatency.classList.remove('active');
    DOM.btnModeLowLatency.setAttribute('aria-checked', 'false');
    DOM.currentLatencyBadge.textContent = 'Voice Clarity';
    DOM.currentLatencyBadge.className = 'badge badge-gain';
    DOM.statusLatencyText.textContent = 'Enhanced (~25ms)';

    // Enable light voice processing
    state.noiseSuppression = true;
    DOM.chkNoiseSuppression.checked = true;

    showToast('Switched to Voice Clarity Mode (noise reduction enabled)', 'info');
  }

  // If live, restart audio stream seamlessly to apply new constraints
  if (state.isRunning) {
    restartStreamWithCurrentSettings();
  }
}

async function restartStreamWithCurrentSettings() {
  if (!state.isRunning) return;
  showToast('Applying audio settings...', 'info');
  stopMicrophone();
  await startMicrophone();
}

// ==========================================================================
// Toast Notification Utility
// ==========================================================================
function showToast(message, type = 'info', duration = 3500) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#34D399" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
  } else if (type === 'warning') {
    iconSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#FBBF24" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#F43F5E" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  } else {
    iconSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#38BDF8" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ==========================================================================
// Modal Utilities
// ==========================================================================
function openModal(modalEl) {
  modalEl.classList.remove('hidden');
  const focusable = modalEl.querySelector('button, [tabindex="0"]');
  if (focusable) focusable.focus();
}

function closeModal(modalEl) {
  modalEl.classList.add('hidden');
}

// ==========================================================================
// Event Listeners
// ==========================================================================
function initEventListeners() {
  // Main Microphone Toggle Button
  DOM.toggleMicBtn.addEventListener('click', () => {
    // Haptic feedback if supported on mobile
    if (navigator.vibrate) navigator.vibrate(25);

    if (state.isRunning) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  });

  // Mute / Unmute
  DOM.toggleMuteBtn.addEventListener('click', () => {
    if (navigator.vibrate) navigator.vibrate(15);
    toggleMute();
  });

  // Speaker Test Tone
  DOM.testSpeakerBtn.addEventListener('click', playSpeakerTestSound);

  // Wake Lock Screen Toggle
  DOM.toggleWakeLockBtn.addEventListener('click', () => {
    if (state.isWakeLockActive) {
      releaseWakeLock();
      showToast('Screen Wake Lock disabled', 'info');
    } else {
      acquireWakeLock();
      showToast('Screen will stay awake during use', 'info');
    }
  });

  // Volume Slider
  DOM.gainSlider.addEventListener('input', (e) => setGain(e.target.value));
  DOM.btnResetGain.addEventListener('click', () => setGain(1.0));
  DOM.btnVolumeDown.addEventListener('click', () => setGain(state.gainValue - 0.05));
  DOM.btnVolumeUp.addEventListener('click', () => setGain(state.gainValue + 0.05));

  // Visualizer View Mode Buttons
  const visButtons = [DOM.btnVisBars, DOM.btnVisWave, DOM.btnVisBoth];
  visButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      visButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.visMode = btn.getAttribute('data-mode');

      if (state.visMode === 'bars') {
        DOM.vuMeterContainer.classList.remove('hidden');
        DOM.oscilloscopeContainer.classList.add('hidden');
      } else if (state.visMode === 'wave') {
        DOM.vuMeterContainer.classList.add('hidden');
        DOM.oscilloscopeContainer.classList.remove('hidden');
      } else {
        DOM.vuMeterContainer.classList.remove('hidden');
        DOM.oscilloscopeContainer.classList.remove('hidden');
      }
    });
  });

  // Latency Mode Buttons
  DOM.btnModeLowLatency.addEventListener('click', () => setLatencyMode('low-latency'));
  DOM.btnModeVoiceClarity.addEventListener('click', () => setLatencyMode('voice-clarity'));

  // Device Selection Changes
  DOM.micSelect.addEventListener('change', (e) => {
    state.selectedMicId = e.target.value;
    if (state.isRunning) restartStreamWithCurrentSettings();
  });

  DOM.outputSelect.addEventListener('change', async (e) => {
    state.selectedOutputId = e.target.value;
    DOM.statusOutputText.textContent = DOM.outputSelect.options[DOM.outputSelect.selectedIndex].text;
    if (state.isRunning) {
      await connectAudioOutput();
      showToast('Output audio routed to ' + DOM.statusOutputText.textContent, 'info');
    }
  });

  DOM.btnRefreshDevices.addEventListener('click', async () => {
    await refreshAudioDevices();
    showToast('Refreshed audio devices list', 'info');
  });

  // Advanced Processing Checkboxes
  DOM.chkEchoCancellation.addEventListener('change', (e) => {
    state.echoCancellation = e.target.checked;
    if (state.isRunning) restartStreamWithCurrentSettings();
  });

  DOM.chkNoiseSuppression.addEventListener('change', (e) => {
    state.noiseSuppression = e.target.checked;
    if (state.isRunning) restartStreamWithCurrentSettings();
  });

  DOM.chkAutoGain.addEventListener('change', (e) => {
    state.autoGainControl = e.target.checked;
    if (state.isRunning) restartStreamWithCurrentSettings();
  });

  DOM.chkHighPass.addEventListener('change', (e) => {
    state.highPassFilter = e.target.checked;
    if (state.isRunning) restartStreamWithCurrentSettings();
  });

  // Modals Open/Close
  DOM.btnOpenGuide.addEventListener('click', () => openModal(DOM.guideModal));
  DOM.btnFooterGuide.addEventListener('click', () => openModal(DOM.guideModal));
  DOM.btnCloseGuideModal.addEventListener('click', () => closeModal(DOM.guideModal));
  DOM.btnCloseGuideModalBtn.addEventListener('click', () => closeModal(DOM.guideModal));

  DOM.btnFeedbackTips.addEventListener('click', () => openModal(DOM.feedbackModal));
  DOM.btnCloseFeedbackModal.addEventListener('click', () => closeModal(DOM.feedbackModal));
  DOM.btnCloseFeedbackModalBtn.addEventListener('click', () => closeModal(DOM.feedbackModal));

  DOM.btnOpenPrivacy.addEventListener('click', () => openModal(DOM.privacyModal));
  DOM.btnFooterPrivacy.addEventListener('click', () => openModal(DOM.privacyModal));
  DOM.btnClosePrivacyModal.addEventListener('click', () => closeModal(DOM.privacyModal));
  DOM.btnClosePrivacyModalBtn.addEventListener('click', () => closeModal(DOM.privacyModal));

  DOM.btnClosePermissionModal.addEventListener('click', () => closeModal(DOM.permissionModal));
  DOM.btnCancelPermissionModal.addEventListener('click', () => closeModal(DOM.permissionModal));
  DOM.btnGrantPermissionModal.addEventListener('click', () => {
    state.hasShownPermissionPrePrompt = true;
    closeModal(DOM.permissionModal);
    startMicrophone();
  });

  // Close modals on backdrop click or ESC key
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach((modal) => closeModal(modal));
    } else if ((e.key === ' ' || e.key.toLowerCase() === 'm') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'BUTTON') {
      // Space or 'M' key toggles mute when live
      if (state.isRunning) {
        e.preventDefault();
        toggleMute();
      }
    }
  });
}
