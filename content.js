// Подключение обработчика сообщений
chrome.runtime.onMessage.addListener(onMessageHandler);


// Очистка текста и логирование символов
function analyzeText(text) {
    if (!text) return "";
    let cleanedText = text
        .replace(/[ ​]/g, " ") 
        .replace(/\s*\n\s*/g, ", ") 
        .replace(/\s+/g, " ") 
        .trim();

    return cleanedText;
}

// Получение заголовка страницы
function getPageTitle() {
    let pageTitle = document.querySelector(".document-title-wrapper [contenteditable=true]");
    return pageTitle ? pageTitle.innerText.trim() : "Untitled";
}

// Определение элементов контента для обработки
function getContentElements(settings) {
    let selectors = [];
    if (settings.allow_text) selectors.push("p"); 
    if (settings.allow_table) selectors.push("table");
    if (settings.allow_bulleted_list) selectors.push(".bullet_list");
    if (settings.allow_to_do) selectors.push(".checkbox_list");
    if (settings.allow_numbered_list) selectors.push(".ordered_list");
    if (settings.allow_code) selectors.push(".code-block");
    if (settings.allow_quote) selectors.push("blockquote");
    if (settings.allow_toggle_h1_title) selectors.push("h1");
    if (settings.allow_toggle_h2_title) selectors.push("h2");
    if (settings.allow_toggle_h3_title) selectors.push("h3");
    if (settings.allow_toggle_h1_content) selectors.push("h1");
    if (settings.allow_toggle_h2_content) selectors.push("h2");
    if (settings.allow_toggle_h3_content) selectors.push("h3");
    if (settings.allow_column) selectors.push(".columns .column-body");
    if (settings.allow_toggle_content) selectors.push(".toggle-body");
    if (settings.allow_toggle_title) selectors.push(".toggle-heading");
    if (settings.allow_callout) selectors.push(".notice-block, .sync-block");
    if (selectors.length === 0) console.log("[content.js] Нет включённых типов блоков.");
    return selectors;
}

// Получение включённых форматов текста
function getEnabledTextFormats(settings) {
    let formats = [];
    if (settings.allow_formatting_bold) formats.push("b, strong");
    if (settings.allow_formatting_italic) formats.push("i, em");
    if (settings.allow_formatting_underline) formats.push("u");
    if (settings.allow_formatting_strike) formats.push("s, del");
    if (settings.allow_formatting_code) formats.push("code");
    return formats;
}

// Функция обработки контента
function processContent(settings) {
    let textContent = [];

    // 1. Добавление заголовка страницы, если он разрешён в настройках
    if (settings.allow_title) {
        let enabledFormats = getEnabledTextFormats(settings);
        
        if (enabledFormats.length === 0) { 
            let pageTitle = getPageTitle();
            if (pageTitle && pageTitle !== "Untitled") {
                textContent.push(pageTitle);
            }
        }
    }

    // 2. Определение контейнера с контентом
    let contentBlock = document.querySelector(".ProseMirror");
    let selectors = getContentElements(settings);
    if (!contentBlock || selectors.length === 0) return textContent.join(" ");

    // 3. Обработка заголовков H1–H3 и их содержимого, если включено в настройках
    if (settings.allow_toggle_h1_title || settings.allow_toggle_h2_title || settings.allow_toggle_h3_title ||
        settings.allow_toggle_h1_content || settings.allow_toggle_h2_content || settings.allow_toggle_h3_content) {
        processHeaders(contentBlock, selectors, settings, textContent);
    }

    // 4. Извлечение обычного текста (абзацев)
    if (settings.allow_text) {
        extractTextFromElements(contentBlock, "p", textContent, true, settings);
    }

    // 5. Обработка кода (блоки <pre>)
    if (settings.allow_code) {
        extractTextFromElements(contentBlock, "pre", textContent, false, settings);
    }

    if (settings.allow_toggle_title) {
        extractTextFromElements(contentBlock, ".toggle-heading", textContent, true, settings);
    }

    // 6. Обход всех блоков контента и извлечение текста
    contentBlock.querySelectorAll(selectors.join(", ")).forEach(block => {
        if (!block.tagName || !block.tagName.match(/^H[1-3]$/i)) {
            extractTextFromElements(block, "p", textContent, false, settings);
            extractTextFromElements(block, "span", textContent, false, settings);
        }
    });

    // 7. Возвращаем объединённый текст
    return textContent.join(" ");
}

function processHeaders(contentBlock, selectors, settings, textContent) {
    contentBlock.querySelectorAll(selectors.join(", ")).forEach(header => {
        if (header.tagName && header.tagName.match(/^H[1-3]$/i)) {
            let headerLevel = parseInt(header.tagName.substring(1), 10);

            // Обработка заголовков, если включены соответствующие настройки
            if ((settings.allow_toggle_h1_title && headerLevel === 1) ||
                (settings.allow_toggle_h2_title && headerLevel === 2) ||
                (settings.allow_toggle_h3_title && headerLevel === 3)) {
                let cleanedText = extractTextStyles(header, settings);
                if (cleanedText.length > 0) {
                    textContent.push(cleanedText);
                }
            }

            // Обработка контента между заголовками, если включены соответствующие настройки
            if ((settings.allow_toggle_h1_content && headerLevel === 1) ||
                (settings.allow_toggle_h2_content && headerLevel === 2) ||
                (settings.allow_toggle_h3_content && headerLevel === 3)) {
                let currentElement = header.nextElementSibling;
                const initialHeaderLevel = headerLevel;

                while (currentElement) {
                    // Если встретили заголовок того же или более высокого уровня, прерываем цикл
                    if (currentElement.tagName && currentElement.tagName.match(/^H[1-3]$/i)) {
                        const currentHeaderLevel = parseInt(currentElement.tagName.substring(1), 10);
                        if (currentHeaderLevel <= initialHeaderLevel) {
                            break;
                        }
                    }

                    // Извлекаем текст из текущего элемента
                    let cleanedText = extractTextStyles(currentElement, settings);
                    if (cleanedText.length > 0) {
                        textContent.push(cleanedText);
                    }

                    // Переходим к следующему элементу
                    currentElement = currentElement.nextElementSibling;
                }
            }
        }
    });
}

function extractTextFromElements(block, tag, textContent, isTopLevel = false, settings) {
    if (tag) {
        block.querySelectorAll(tag).forEach(el => {
            if (isTopLevel && tag === "p" && el.parentElement !== block) {
                return;
            }
            let cleanedText = extractTextStyles(el, settings);
            if (cleanedText.length > 0) {
                textContent.push(cleanedText);
            }
        });
    }
}


function extractTextStyles(element, settings) {
    let enabledFormats = getEnabledTextFormats(settings);

    if (enabledFormats.length === 0) {
        return element.innerText.trim(); 
    }

    let formattedTexts = [];
    enabledFormats.forEach(selector => {
        element.querySelectorAll(selector).forEach(formatEl => {
            let text = formatEl.innerText.trim();
            if (text.length > 0) {
                formattedTexts.push(text);
            }
        });
    });

    return formattedTexts.length > 0 ? formattedTexts.join(" ") : "";
}


// Обработчик сообщений
function onMessageHandler(settings, sender, sendResponse) {
    try {
        let frameTitle = getPageTitle();
        let rawText = processContent(settings);
        let cleanedText = analyzeText(rawText, "Полученный текст с пробелами");

        let counts = countCharacters(cleanedText);
        let wordCounts = countWords(cleanedText);

        sendResponse({
            title: frameTitle,
            words: wordCounts.total,
            symbols: counts.total,
            wordsCyrillic: wordCounts.cyrillic,
            wordsLatin: wordCounts.latin,
            symbolsCyrillic: counts.cyrillic,
            symbolsLatin: counts.latin,
            raw: cleanedText
        });

    } catch (error) {
        console.log("[content.js] Ошибка: " + error.message);
    }
}


// Подсчёт слов
function countWords(text) {
    let words = text.match(/[a-zA-Zа-яА-ЯёЁ]{2,}/g) || [];

    let cyrillicWords = words.filter(word => /^[а-яА-ЯёЁ]+$/.test(word));
    let latinWords = words.filter(word => /^[a-zA-Z]+$/.test(word));

    console.log(`[content.js] Найденные слова: ${words.join(", ")}`);
    console.log(`[content.js] Итоговое количество слов: ${words.length}`);
    console.log(`[content.js] Кириллические слова: ${cyrillicWords.length}`);
    console.log(`[content.js] Латинские слова: ${latinWords.length}`);

    return {
        total: words.length,
        cyrillic: cyrillicWords.length,
        latin: latinWords.length
    };
}


// Подсчёт символов
function countCharacters(text) {
    let cleanedText = text.replace(/\s+/g, "");
    let latinCount = (cleanedText.match(/[a-zA-Z]/g) || []).length;
    let cyrillicCount = (cleanedText.match(/[а-яА-ЯёЁ]/g) || []).length;
    let totalCount = cleanedText.length;
    console.log(`[content.js] Общее количество символов (без пробелов): ${totalCount}`);

    return {
        latin: latinCount,
        cyrillic: cyrillicCount,
        total: totalCount,
    };
}

// Сохранение страницы в истории
function savePageCount(url, count) {
    chrome.storage.local.get(["history"], function (result) {
        let history = result.history || {};
        history[url] = (history[url] || 0) + count;
        console.log(`[savePageCount] Текущая история:`, history);
        chrome.storage.local.set({ history });
    });
}

// Получение общей суммы символов
function getTotalCount(callback) {
    console.log(`[getTotalCount] Запрос общей суммы символов из истории.`);
    chrome.storage.local.get(["history"], function (result) {
        let history = result.history || {};
        let total = Object.values(history).reduce((sum, num) => sum + num, 0);
        console.log(`[getTotalCount] Общая сумма символов: ${total}`);
        callback(total);
    });
}

