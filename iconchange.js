function sendTheme() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    chrome.runtime.sendMessage({ scheme: isDark ? "dark" : "light" });
}

// Отправить тему сразу при загрузке
sendTheme();

// Слушать смену темы и повторно отправлять сообщение
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    sendTheme();
});