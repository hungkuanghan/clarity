let connections: any[] = [];
let settingsSent: boolean;


chrome.commands.onCommand.addListener((command) => {
  if (command == "switch-recording") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "switch-recording" })
    })
  }
})

// Receive message from content script and relay it to the devtools page
chrome.runtime.onMessage.addListener(
    function(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): boolean {
        switch (message.action) {
          case "activate":
            if (sender.tab) {
              let tabId = sender.tab.id;
              let success = tabId in connections && settingsSent;
              let icon = success ? "icon-activated.png" : "icon.png";
              let title = success ? "Clarity Developer Tools" : "Clarity Developer Tools: Open developer tools to activate";
              chrome.browserAction.setIcon({ path: icon, tabId });
              chrome.browserAction.setTitle({ title, tabId });
              sendResponse({ success });
            }
            return true;
          case "payload":
            if (sender.tab) {
              let tabId = sender.tab.id;
              let success = tabId in connections;
              if (success) {
                connections[tabId].postMessage(message);
              }
              sendResponse({ success });
            }
            return true;
          case 'init':
            if (sender.tab) {
              let tabId = sender.tab.id;
              connections[tabId] = 'init';

              const url = new URL(sender.tab.url);
              const domain = url.hostname;

              fetch(`http://localhost:80/settings?domain=${domain}`,
                  { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }).then((res) => {
                settingsSent = true;
                const success = tabId in connections;
                res.json().then(({ settings }) => {
                  sendResponse({ success, settings });
                })
              });
            }
            return true;
          case 'warn':
            if (sender.tab) {
              let tabId = sender.tab.id;
              let success = tabId in connections;
              chrome.tabs.sendMessage(tabId, { action: "warn", message: message.message });
              sendResponse({ success });
              
            }
            return true;
          default:
            return true;
        }
    }
);
