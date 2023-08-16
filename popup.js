document.getElementById('start').addEventListener('click', async () => {
    //const tab = await getCurrentTab()
    //if(!tab) return alert('Require an active tab')
    chrome.runtime.sendMessage({ action: "startAudio" });
})

document.getElementById('stop').addEventListener('click', async () => {
    //const tab = await getCurrentTab()
    //if(!tab) return alert('Require an active tab')
   // chrome.tabs.sendMessage(tab.id, { message: 'stop' })
    // let endTabId;
    // chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    //   endTabId = tabs[0].id;
    //   if(mediaRecorder && startTabId === endTabId){
    //     mediaRecorder.stop();
    //     }
    // }
    // )

    chrome.runtime.sendMessage({ action: "stopAudio" });

})

// async function getCurrentTab() {
//     const queryOptions = { active: true, lastFocusedWindow: true }
//     const [tab] = await chrome.tabs.query(queryOptions)
//     return tab
// }
