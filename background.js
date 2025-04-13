// Listen for keyboard command
chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle-find") {
        // Get the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // Programmatically open the popup
                chrome.action.openPopup();
            }
        });
    }
});

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log("Extension installed/updated:", details.reason);
});

// Keep service worker active
chrome.runtime.onStartup.addListener(() => {
    console.log("Browser started, extension active");
});
