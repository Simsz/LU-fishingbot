let mediaRecorder;
let audioContext;
let capturedStream;
let audioCueBuffer;
let analyser;
let canPressKey = true;
let inputBuffer = []; // Buffer to hold incoming audio data

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "log") {
    console.log("Content Script Output: " + request.message);
  }

  if (request.action === "startAudio") {
    // Use the chrome.tabCapture API to capture the current tab and record the screen
    chrome.tabCapture.capture({ audio: true }, function (stream) {
      console.log("Audio Capture Started...");
      capturedStream = stream;
      audioContext = audioContext || new AudioContext();

      // Preprocess the audio cue
      //console.log("Fetching audio....");
      fetch("cstrim.wav") // Replace with the correct path
        .then((response) => response.arrayBuffer())
        .then((buffer) => audioContext.decodeAudioData(buffer))
        .then((decodedAudio) => {
          const fullCueBuffer = decodedAudio.getChannelData(0);
          audioCueBuffer = fullCueBuffer.slice(0, 1024);
        });

      const streamSource = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      streamSource.connect(analyser);
      analyser.connect(audioContext.destination);
      //console.log("Ready to create listener....");

      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.addEventListener("dataavailable", analyze);

      const sampleRate = audioContext.sampleRate; // e.g., 44100 Hz
      const samples = 1024;
      const time = (samples / sampleRate) * 1000;

      mediaRecorder.start(time);
    });
  } else if (request.action === "stopAudio") {
    console.log("!!!!!! Recorder stopped. !!!!!!");
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
    if (capturedStream) {
      capturedStream.getTracks().forEach((track) => track.stop());
    }
  }
});

// Cross-correlation function
function crossCorrelate(buffer1, buffer2) {
  const threshold = 0.0095;
  let maxCorrelation = 0;
  //console.log("Buffer1 " + buffer1 + "   Buffer2 " + buffer2);

  for (let lag = 0; lag <= buffer1.length - buffer2.length; lag++) {
    let correlation = 0;
    for (let i = 0; i < buffer2.length; i++) {
      correlation += buffer1[lag + i] * buffer2[i];
    }
    correlation /= buffer2.length;
    if (correlation > maxCorrelation) {
      maxCorrelation = correlation;
      //console.log("Max Corr1  :" + maxCorrelation);
    }
  }
  // if (maxCorrelation > threshold) {
  //   console.log("Triggering threshold with value:" + maxCorrelation);
  // }
  return maxCorrelation > threshold;
}

// Function to analyze the audio data and detect the cue
function analyze() {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Float32Array(bufferLength);
  analyser.getFloatTimeDomainData(dataArray);

  // Normalize and append new data to inputBuffer
  inputBuffer = inputBuffer.concat(Array.from(dataArray).map((x) => x / 32768));

  // If inputBuffer is longer than audioCueBuffer, analyze it
  while (inputBuffer.length >= audioCueBuffer.length) {
    const segmentToAnalyze = inputBuffer.slice(0, audioCueBuffer.length);

    const normalizedInputBuffer = normalize(segmentToAnalyze);
    const normalizedCueBuffer = normalize(audioCueBuffer);
    if (crossCorrelate(segmentToAnalyze, normalizedCueBuffer)) {
      //Cue is found, execute action
      if (canPressKey) {
        //console.log("Sending runtime sendKey action!");
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: "sendKey", tab: tabs[0].id },
              function (response) {}
            );
          }
        );
        //console.log("Keypress Sent!");
        resetFlag(1000);
      }
    }

    // Remove the analyzed segment from the inputBuffer
    inputBuffer = inputBuffer.slice(audioCueBuffer.length);
  }

  requestAnimationFrame(analyze); // Continuously analyze the audio
}

function normalize(buffer) {
  let max = Math.abs(buffer[0]);
  for (let i = 1; i < buffer.length; i++) {
    const absValue = Math.abs(buffer[i]);
    if (absValue > max) {
      max = absValue;
    }
  }

  if (max === 0) return buffer; // Avoid division by zero

  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = buffer[i] / max;
  }

  return buffer;
}

async function resetFlag(delay) {
  //console.log("Starting Delay!");
  canPressKey = false;
  await new Promise((resolve) => setTimeout(resolve, delay));
  canPressKey = true;
  //console.log("Ending Delay!");
}
