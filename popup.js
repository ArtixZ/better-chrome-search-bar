document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const matchCaseCheckbox = document.getElementById("matchCase");
    const wholeWordCheckbox = document.getElementById("wholeWord");
    const useRegexCheckbox = document.getElementById("useRegex");
    const prevButton = document.getElementById("prevButton");
    const nextButton = document.getElementById("nextButton");
    const currentMatchSpan = document.getElementById("currentMatch");
    const totalMatchesSpan = document.getElementById("totalMatches");

    // Detect OS and set keyboard shortcut tooltips
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const modifierKey = isMac ? "⌘" : "Ctrl";
    const shiftKey = isMac ? "⇧" : "Shift";

    // Update tooltips based on OS
    matchCaseCheckbox.parentElement.title = `${shiftKey}+${modifierKey}+C`;
    wholeWordCheckbox.parentElement.title = `${shiftKey}+${modifierKey}+W`;
    useRegexCheckbox.parentElement.title = `${shiftKey}+${modifierKey}+R`;
    prevButton.title = `${shiftKey}+Enter`;
    nextButton.title = `Enter`;

    let debounceTimeout;
    let isContentScriptReady = false;

    // Load saved search options
    const loadSearchOptions = () => {
        chrome.storage.local.get(["searchOptions"], (result) => {
            if (result.searchOptions) {
                matchCaseCheckbox.checked =
                    result.searchOptions.matchCase ?? false;
                wholeWordCheckbox.checked =
                    result.searchOptions.wholeWord ?? false;
                useRegexCheckbox.checked =
                    result.searchOptions.useRegex ?? false;
            }
        });
    };

    // Save search options
    const saveSearchOptions = () => {
        const options = {
            matchCase: matchCaseCheckbox.checked,
            wholeWord: wholeWordCheckbox.checked,
            useRegex: useRegexCheckbox.checked,
        };
        chrome.storage.local.set({ searchOptions: options });
    };

    // Function to show shortcut message
    const showShortcutMessage = () => {
        const container = document.querySelector(".search-container");
        const messageDiv = document.createElement("div");
        messageDiv.className = "message info";
        messageDiv.innerHTML = `💡 Pro tip: Set up <strong>Cmd+F</strong> in <a href="#">chrome://extensions/shortcuts</a>`;
        container.insertBefore(messageDiv, container.firstChild);

        // Open chrome://extensions/shortcuts when clicked
        messageDiv.addEventListener("click", () => {
            chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
        });
    };

    // Check if shortcut is configured
    chrome.commands.getAll((commands) => {
        const toggleFind = commands.find((cmd) => cmd.name === "toggle-find");
        if (!toggleFind || !toggleFind.shortcut) {
            showShortcutMessage();
        }
    });

    // Function to check if content script is loaded
    const checkContentScript = () => {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: "ping" },
                    (response) => {
                        resolve(!chrome.runtime.lastError && response);
                    }
                );
            });
        });
    };

    // Function to go to next match
    const goToNextMatch = () => {
        if (!isContentScriptReady) return;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(
                tabs[0].id,
                { action: "next" },
                (response) => {
                    if (response) {
                        currentMatchSpan.textContent = response.currentMatch;
                    }
                }
            );
        });
    };

    // Function to show refresh message
    const showRefreshMessage = () => {
        const container = document.querySelector(".search-container");
        const messageDiv = document.createElement("div");
        messageDiv.className = "message warning";
        messageDiv.textContent =
            "Please refresh the page to enable enhanced find functionality";
        container.insertBefore(messageDiv, container.firstChild);

        // Disable all controls
        searchInput.disabled = true;
        matchCaseCheckbox.disabled = true;
        wholeWordCheckbox.disabled = true;
        useRegexCheckbox.disabled = true;
        prevButton.disabled = true;
        nextButton.disabled = true;
    };

    // Function to perform search
    const performSearch = async () => {
        if (!isContentScriptReady) {
            const ready = await checkContentScript();
            if (!ready) {
                showRefreshMessage();
                return;
            }
            isContentScriptReady = true;
        }

        const query = searchInput.value;
        const options = {
            matchCase: matchCaseCheckbox.checked,
            wholeWord: wholeWordCheckbox.checked,
            useRegex: useRegexCheckbox.checked,
        };

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(
                tabs[0].id,
                {
                    action: "search",
                    query: query,
                    options: options,
                },
                (response) => {
                    if (response) {
                        currentMatchSpan.textContent =
                            response.currentMatch || 0;
                        totalMatchesSpan.textContent = response.matchCount || 0;
                    }
                }
            );
        });
    };

    // Debounced search function
    const debouncedSearch = () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(performSearch, 300);
    };

    // Add global keyboard shortcuts
    document.addEventListener("keydown", (e) => {
        // Check if Shift + Cmd/Ctrl + key is pressed
        if (e.shiftKey && (e.metaKey || e.ctrlKey)) {
            switch (e.key.toLowerCase()) {
                case "c":
                    e.preventDefault();
                    matchCaseCheckbox.checked = !matchCaseCheckbox.checked;
                    matchCaseCheckbox.dispatchEvent(new Event("change"));
                    break;
                case "w":
                    e.preventDefault();
                    wholeWordCheckbox.checked = !wholeWordCheckbox.checked;
                    wholeWordCheckbox.dispatchEvent(new Event("change"));
                    break;
                case "r":
                    e.preventDefault();
                    useRegexCheckbox.checked = !useRegexCheckbox.checked;
                    useRegexCheckbox.dispatchEvent(new Event("change"));
                    break;
            }
        }
    });

    // Event listeners
    searchInput.addEventListener("input", debouncedSearch);

    // Add Enter key handler
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) {
                // Shift+Enter goes to previous match
                prevButton.click();
            } else {
                // Enter goes to next match
                goToNextMatch();
            }
        }
    });

    // Add change listeners that save options
    matchCaseCheckbox.addEventListener("change", () => {
        saveSearchOptions();
        performSearch();
    });
    wholeWordCheckbox.addEventListener("change", () => {
        saveSearchOptions();
        performSearch();
    });
    useRegexCheckbox.addEventListener("change", () => {
        saveSearchOptions();
        performSearch();
    });

    prevButton.addEventListener("click", () => {
        if (!isContentScriptReady) return;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(
                tabs[0].id,
                { action: "previous" },
                (response) => {
                    if (response) {
                        currentMatchSpan.textContent = response.currentMatch;
                    }
                }
            );
        });
    });

    nextButton.addEventListener("click", goToNextMatch);

    // Check content script status when popup opens
    checkContentScript().then((ready) => {
        isContentScriptReady = ready;
        if (!ready) {
            showRefreshMessage();
        }
    });

    // Load saved search options when popup opens
    loadSearchOptions();

    // Focus search input when popup opens
    searchInput.focus();
});
