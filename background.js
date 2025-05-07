try {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        console.log("Получено сообщение:", request);
    
        if (request.scheme === "dark") {
            console.log("Переключаемся на темную тему");
            chrome.action.setIcon({
                path: {
                    "16": "images/toolbar-icon-16-dark.png",
                    "19": "images/toolbar-icon-19-dark.png",
                    "24": "images/toolbar-icon-24-dark.png",
                    "32": "images/toolbar-icon-32-dark.png",
                    "38": "images/toolbar-icon-38-dark.png",
                    "48": "images/toolbar-icon-48-dark.png"
                }
            });
        } else {
            console.log("Переключаемся на светлую тему");
            chrome.action.setIcon({
                path: {
                    "16": "images/toolbar-icon-16.png",
                    "19": "images/toolbar-icon-19.png",
                    "24": "images/toolbar-icon-24.png",
                    "32": "images/toolbar-icon-32.png",
                    "38": "images/toolbar-icon-38.png",
                    "48": "images/toolbar-icon-48.png"
                }
            });
        }
    });

    // Создание конфигурации при установке аддона
    chrome.runtime.onInstalled.addListener(async function() {
        chrome.storage.local.get("settings", function(data) {
            if (Object.keys(data).length === 0) { 
                chrome.storage.local.set({
                    "settings": {
                        allow_title: false,
                        allow_text: false,
                        allow_to_do: false,
                        allow_bulleted_list: false,
                        allow_numbered_list: false,
                        allow_toggle_title: false,
                        allow_toggle_content: false,
                        allow_code: false,
                        allow_quote: false,
                        allow_callout: false,
                        allow_toggle_h1_title: false,
                        allow_toggle_h1_content: false,
                        allow_toggle_h2_title: false,
                        allow_toggle_h2_content: false,
                        allow_toggle_h3_title: false,
                        allow_toggle_h3_content: false,
                        allow_column: false,
                        allow_table: false,
                        count_type: "count_words",
                        allow_formatting_bold: false,
                        allow_formatting_italic: false,
                        allow_formatting_underline: false,
                        allow_formatting_strike: false,
                        allow_formatting_code: false
                    }
                });
            }
        });
    });
    } catch (e) {
        console.error(e);
    }
    