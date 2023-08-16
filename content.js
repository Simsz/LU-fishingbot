//Listen for time to press keypress
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  sendResponse({ status: "ok" });
  if (request.action === "sendKey") {
    //logToBackground("Key Requested to be pressed. : " + request.tab);
    //logToBackground("About to send keypress");
    //sendKeyPress(request.tab);

    // Create a new KeyboardEvent for the "F" key
    sendKeyPress()
    //logToBackground("First key sent, waiting 2000ms and sending another");

    setTimeout(sendKeyPress, 1000);

  }
  // return true;
});

function sendKeyPress() {
  //logToBackground("sending keypress....");
  const keyDownEvent = new KeyboardEvent("keydown", {
    key: "f",
    code: "KeyF",
    keyCode: 70,
    bubbles: true,
    cancelable: true,
  });

  const keyUpEvent = new KeyboardEvent('keyup', {
    key: 'f',
    code: 'KeyF',
    keyCode: 70,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(keyDownEvent);

  setTimeout(() => document.dispatchEvent(keyUpEvent), 100);

  logToBackground("KEY SENT");
}

function logToBackground(message) {
  chrome.runtime.sendMessage({ action: "log", message: message });
}
