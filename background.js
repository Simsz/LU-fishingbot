// Background script for audio analysis and detection
const Background = (function () {
  // Constants
  const SAMPLE_SIZE = 1024;
  const THRESHOLD = 0.9; //Match Threshold
  const MAX_INT_16 = 32768;
  const SCALING_FACTOR = 10;
  const DEBUG_MODE = true; // Set to true for debugging logs

  // Private variables
  let mediaRecorder;
  let audioContext;
  let capturedStream;
  let audioCueBuffer;
  let analyzer;
  let canPressKey = true;
  let fishTab;
  let inputBuffer = [];

  function logMessage(message) {
    if (DEBUG_MODE) {
      console.log(message);
    }
  }

  async function fetchAndDecodeAudio() {
    const response = await fetch("cstrim.wav");
    const buffer = await response.arrayBuffer();
    const decodedAudio = await audioContext.decodeAudioData(buffer);
    audioCueBuffer = decodedAudio.getChannelData(0).slice(0, SAMPLE_SIZE);
  }

  function getCurrentTabId(callback) {
    logMessage("Fishing Bot - Getting Tab ID");
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs[0]) {
        callback(tabs[0].id);
      }
    });
  }

  function startAudio() {
    logMessage("Fishing Bot - Started.");
    chrome.tabCapture.capture({ audio: true }, async function (stream) {
      capturedStream = stream;
      audioContext = audioContext || new AudioContext();
      await fetchAndDecodeAudio();

      const STREAM_SOURCE = audioContext.createMediaStreamSource(stream);
      analyzer = audioContext.createAnalyser();
      STREAM_SOURCE.connect(analyzer);
      analyzer.connect(audioContext.destination);

      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.addEventListener("dataavailable", analyze);

      const TIME = (SAMPLE_SIZE / audioContext.sampleRate) * 1000;
      getCurrentTabId((tabId) => (fishTab = tabId));
      mediaRecorder.start(TIME);
    });
  }

  function stopAudio() {
    logMessage("Fishing Bot - Stopped.");
    if (mediaRecorder) mediaRecorder.stop();
    if (capturedStream)
      capturedStream.getTracks().forEach((track) => track.stop());
  }

  // Reset cooldown on keypress
  async function resetFlag(delay) {
    logMessage("Fishing Bot - Resetting Flag.");
    canPressKey = false;
    await new Promise((resolve) => setTimeout(resolve, delay));
    canPressKey = true;
  }

  //Normalize audio stream based on max buffer value
  function normalize(buffer) {
    let max = Math.abs(buffer[0]);
    for (let i = 1; i < buffer.length; i++) {
      const ABS_VALUE = Math.abs(buffer[i]);
      if (ABS_VALUE > max) {
        max = ABS_VALUE;
      }
    }

    if (max === 0) return buffer;

    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = (buffer[i] / max) * SCALING_FACTOR;
    }

    return buffer;
  }

  //Match audio to the supplied audio clip
  function crossCorrelate(buffer1, buffer2) {
    let maxCorrelation = 0;

    for (let lag = 0; lag <= buffer1.length - buffer2.length; lag++) {
      let correlation = 0;
      for (let i = 0; i < buffer2.length; i++) {
        correlation += buffer1[lag + i] * buffer2[i];
      }
      correlation /= buffer2.length;
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
      }
    }
    if (maxCorrelation > THRESHOLD && DEBUG_MODE && canPressKey) {
      logMessage("Triggering THRESHOLD with value:" + maxCorrelation);
    }
    return maxCorrelation > THRESHOLD;
  }

  function analyze() {
    const BUFFER_LEN = analyzer.frequencyBinCount;
    const DATA_ARRAY = new Float32Array(BUFFER_LEN);
    analyzer.getFloatTimeDomainData(DATA_ARRAY);

    // Process the data array and append it to the input buffer
    processDataArray(DATA_ARRAY);

    requestAnimationFrame(analyze);
  }

  function processDataArray(dataArray) {
    // Normalize and append the data
    const NORMALIZED_DATA = Array.from(dataArray).map((x) => x / MAX_INT_16);
    inputBuffer = inputBuffer.concat(NORMALIZED_DATA);
    while (inputBuffer.length >= audioCueBuffer.length) {
      const segmentToAnalyze = inputBuffer.slice(0, audioCueBuffer.length);
      analyzeSegment(segmentToAnalyze);

      // Move to the next segment
      inputBuffer = inputBuffer.slice(audioCueBuffer.length);
    }
  }

  // Separate function to analyze a segment
  function analyzeSegment(segment) {
    const NORMALIZED_INPUT_BUFFER = normalize(segment);
    const NORMALIZED_CUE_BUFFER = normalize(audioCueBuffer);
    if (
      crossCorrelate(NORMALIZED_INPUT_BUFFER, NORMALIZED_CUE_BUFFER) &&
      canPressKey
    ) {
      logMessage("Fishing Bot - Audio match, sending keypress");
      chrome.tabs.sendMessage(
        fishTab,
        { action: "sendKey", tab: fishTab },
        function (response) {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            alert(
              "Content Script unloaded. Please turn off bot, refresh tab and turn on bot."
            );
          } else {
            logMessage("SendKey Response: " + response);
          }
        }
      );
      resetFlag(1800);
    }
  }
  // Chrome runtime message listener
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.action === "log")
      logMessage("Content Script Output: " + request.message);
    if (request.action === "startAudio") startAudio();
    if (request.action === "stopAudio") stopAudio();

    sendResponse({ status: "ok" });
    return true;
  });

  // Public functions (none needed currently)
  return {};
})();
