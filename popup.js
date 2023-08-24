
// Popup script for handling start and stop audio actions
document.getElementById('start').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "startAudio" });
});

document.getElementById('stop').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "stopAudio" });
});
