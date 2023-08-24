
// Content script for listening to runtime messages and sending keypress events
const Content = (function() {
    // Constants for event actions
    const ACTIONS = {
        SEND_KEY: "sendKey"
    };

    // Function to send keypress
    function sendKeyPress() {
        const KEY_DOWN_EVENT = new KeyboardEvent("keydown", {
            key: "f",
            code: "KeyF",
            keyCode: 70,
            bubbles: true,
            cancelable: true,
        });

        const KEY_UP_EVENT = new KeyboardEvent('keyup', {
            key: 'f',
            code: 'KeyF',
            keyCode: 70,
            bubbles: true,
            cancelable: true,
        });

        // Dispatching the key events
        document.dispatchEvent(KEY_DOWN_EVENT);
        logToBackground("Fishing Bot Key Script - KEY DOWN");
        setTimeout(() => document.dispatchEvent(KEY_UP_EVENT), 100);
        logToBackground("Fishing Bot Key Script - KEY UP");
    }

    function logToBackground(message) {
        chrome.runtime.sendMessage({ action: "log", message: message });
      }

    // Chrome runtime message listener
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        sendResponse({ status: "ok" });
        if (request.action === ACTIONS.SEND_KEY) {
            sendKeyPress();
            setTimeout(sendKeyPress, 1200);
        }
    });
})();
