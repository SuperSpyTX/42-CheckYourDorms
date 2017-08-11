// Ugh, I hate Chrome Extensions.
var s = document.createElement('script');
s.src = chrome.extension.getURL('content_script.js');
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);