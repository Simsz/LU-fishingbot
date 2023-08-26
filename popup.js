// Function to update button state based on storage
function updateButtonState(button) {
  const buttonId = button.id;
  chrome.storage.sync.get(buttonId, (items) => {
    if (items.hasOwnProperty(buttonId)) {
      const buttonState = items[buttonId];
      button.disabled = !buttonState;
      button.classList.toggle("active", buttonState);
    }
  });
}

// Function to handle button clicks and state updates
function handleButtonClick(button) {
  const buttonId = button.id;
  const oppositeButtonId = buttonId === "start" ? "stop" : "start";
  const oppositeButton = document.getElementById(oppositeButtonId);

  // Toggle button states
  button.disabled = true;
  oppositeButton.disabled = false;

  // Store the state in chrome.storage
  chrome.storage.sync.set({ [buttonId]: false, [oppositeButtonId]: true });

  // Get the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs[0].id;

    // Store the tab-specific state in chrome.storage.local
    chrome.storage.local.set({ [`${activeTabId}-${buttonId}`]: false });
    chrome.storage.local.set({ [`${activeTabId}-${oppositeButtonId}`]: true });

    // Handle audio actions
    if (buttonId === "start") {
      chrome.runtime.sendMessage({ action: "startAudio" });
      chrome.browserAction.setBadgeBackgroundColor({ color: '#FE0000' });
      chrome.browserAction.setBadgeText({ text: "ON" });
      window.close();
    } else if (buttonId === "stop") {
      chrome.runtime.sendMessage({ action: "stopAudio" });
      chrome.browserAction.setBadgeText({});
      window.close();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start");
  const stopButton = document.getElementById("stop");

  // Attach event listeners and update button states
  startButton.addEventListener("click", () => {
    handleButtonClick(startButton);
  });
  stopButton.addEventListener("click", () => {
    handleButtonClick(stopButton);
  });

  // Set initial state
  chrome.storage.sync.get(["start", "stop"], (items) => {
    if (!items.hasOwnProperty("start")) {
      chrome.storage.sync.set({ start: true, stop: false }, () => {
        startButton.disabled = false;
        stopButton.disabled = true;
      });
    } else {
      updateButtonState(startButton);
      updateButtonState(stopButton);
    }
  });
});
