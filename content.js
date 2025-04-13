class EnhancedFind {
    constructor() {
        this.matches = [];
        this.currentMatchIndex = -1;
        this.searchOptions = {
            matchCase: false,
            wholeWord: false,
            useRegex: false,
        };
        this.highlightClass = "enhanced-find-highlight";
        this.activeHighlightClass = "enhanced-find-highlight-active";

        this.initializeMessageListener();
    }

    initializeMessageListener() {
        chrome.runtime.onMessage.addListener(
            (request, sender, sendResponse) => {
                switch (request.action) {
                    case "ping":
                        sendResponse(true);
                        break;
                    case "search":
                        this.performSearch(request.query, request.options);
                        sendResponse({
                            matchCount: this.matches.length,
                            currentMatch: this.currentMatchIndex + 1,
                        });
                        break;
                    case "next":
                        this.nextMatch();
                        sendResponse({
                            currentMatch: this.currentMatchIndex + 1,
                        });
                        break;
                    case "previous":
                        this.previousMatch();
                        sendResponse({
                            currentMatch: this.currentMatchIndex + 1,
                        });
                        break;
                    case "clear":
                        this.clearHighlights();
                        sendResponse({});
                        break;
                }
                return true;
            }
        );
    }

    performSearch(query, options) {
        this.clearHighlights();
        if (!query) return;

        this.searchOptions = options;
        const searchRegex = this.buildSearchRegex(query);
        if (!searchRegex) return;

        this.findMatches(searchRegex);
        if (this.matches.length > 0) {
            this.currentMatchIndex = 0;
            this.highlightMatches();
            this.scrollToMatch(this.currentMatchIndex);
        }
    }

    buildSearchRegex(query) {
        try {
            if (!this.searchOptions.useRegex) {
                query = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            }

            if (this.searchOptions.wholeWord) {
                query = `\\b${query}\\b`;
            }

            return new RegExp(query, this.searchOptions.matchCase ? "g" : "gi");
        } catch (e) {
            console.error("Invalid regex:", e);
            return null;
        }
    }

    findMatches(regex) {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    return node.parentElement.tagName !== "SCRIPT" &&
                        node.parentElement.tagName !== "STYLE"
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_REJECT;
                },
            }
        );

        let node;
        while ((node = walker.nextNode())) {
            let match;
            while ((match = regex.exec(node.textContent))) {
                this.matches.push({
                    node,
                    startOffset: match.index,
                    endOffset: match.index + match[0].length,
                });
            }
        }
    }

    highlightMatches() {
        this.matches.forEach((match, index) => {
            const range = document.createRange();
            range.setStart(match.node, match.startOffset);
            range.setEnd(match.node, match.endOffset);

            const highlight = document.createElement("span");
            highlight.className = this.highlightClass;
            if (index === this.currentMatchIndex) {
                highlight.classList.add(this.activeHighlightClass);
            }

            range.surroundContents(highlight);
        });
    }

    scrollToMatch(index) {
        if (index >= 0 && index < this.matches.length) {
            const element = document.getElementsByClassName(
                this.activeHighlightClass
            )[0];
            if (element) {
                element.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }
        }
    }

    nextMatch() {
        if (this.matches.length === 0) return;

        this.updateActiveMatch(false);
        this.currentMatchIndex =
            (this.currentMatchIndex + 1) % this.matches.length;
        this.updateActiveMatch(true);
        this.scrollToMatch(this.currentMatchIndex);
    }

    previousMatch() {
        if (this.matches.length === 0) return;

        this.updateActiveMatch(false);
        this.currentMatchIndex =
            (this.currentMatchIndex - 1 + this.matches.length) %
            this.matches.length;
        this.updateActiveMatch(true);
        this.scrollToMatch(this.currentMatchIndex);
    }

    updateActiveMatch(isActive) {
        const highlights = document.getElementsByClassName(this.highlightClass);
        if (
            this.currentMatchIndex >= 0 &&
            this.currentMatchIndex < highlights.length
        ) {
            if (isActive) {
                highlights[this.currentMatchIndex].classList.add(
                    this.activeHighlightClass
                );
            } else {
                highlights[this.currentMatchIndex].classList.remove(
                    this.activeHighlightClass
                );
            }
        }
    }

    clearHighlights() {
        const highlights = Array.from(
            document.getElementsByClassName(this.highlightClass)
        );
        highlights.forEach((highlight) => {
            const parent = highlight.parentNode;
            parent.replaceChild(
                document.createTextNode(highlight.textContent),
                highlight
            );
            parent.normalize();
        });
        this.matches = [];
        this.currentMatchIndex = -1;
    }
}

// Initialize the enhanced find functionality
const enhancedFind = new EnhancedFind();
