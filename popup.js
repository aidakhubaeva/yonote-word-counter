// Рендер окна аддона после загрузки базового html
document.addEventListener('DOMContentLoaded', async function() {
    document.getElementById("to-settings").addEventListener("click", toSettings);
    document.getElementById("to-main").addEventListener("click", toMain);
    document.getElementById("add-record").addEventListener("click", addRecord);
    document.getElementById("clear-all").addEventListener("click", clearAll);
    document.getElementById("copy-all").addEventListener("click", copyAll);
    document.getElementById("debug").addEventListener("click", debug);
    document.getElementById("author").addEventListener("click", author);
    document.getElementById("uncheck-all").addEventListener("click", uncheckAll);
    renderMain();
});


function uncheckAll() {
    chrome.storage.local.get("settings", function(data) {
        let updatedSettings = data.settings || {};

        // Очищаем все чекбоксы
        document.querySelectorAll("#settings-allow input[type='checkbox'], #settings-formatting input[type='checkbox']").forEach((checkbox) => {
            checkbox.checked = false;
            updatedSettings[checkbox.id] = false;
        });

        chrome.storage.local.set({ "settings": updatedSettings }, function() {
            renderSettings(); // Обновляем интерфейс
        });
    });
}

// Рендер главной страницы
async function renderMain() {
    let tabs = await chrome.tabs.query({active: true, lastFocusedWindow: true});
    if (!tabs.length || !tabs[0].url) return; 
    let tab = tabs[0];

    let records = (await chrome.storage.local.get("records")).records || {};
    let settings = (await chrome.storage.local.get("settings")).settings || {};

    let isUpdate = false;

    if (Object.keys(records).length > 0) {
        let records_sort = Object.keys(records).sort((a, b) => records[a].time - records[b].time);
        let summary = 0;
        let summaryCyr = 0;
        let summaryLat = 0;

        let records_table = document.getElementById("records");
        records_table.replaceChildren();

        records_sort.forEach((record) => {
            let sel = tab.url === record;
            if (sel) isUpdate = true;

            let recData = records[record];
            let val = settings.count_type == "count_words" ? recData.words : recData.symbols;
            let cyrVal = settings.count_type == "count_words" ? recData.wordsCyrillic : recData.symbolsCyrillic ?? 0;
            let latVal = settings.count_type == "count_words" ? recData.wordsLatin : recData.symbolsLatin ?? 0;

            summary += Number(val);
            summaryCyr += Number(cyrVal);
            summaryLat += Number(latVal);

            let rec = renderRecord(record, recData.title, val, sel);
            records_table.appendChild(rec);
        });

        document.getElementById("words-summary").innerText = summary;
        document.getElementById("cyr-summary").innerText = summaryCyr;
        document.getElementById("lat-summary").innerText = summaryLat;
        document.getElementById("table").style.display = "inline";
        document.getElementById("clear").style.display = "none";

        // Теперь правильно управляем подписями Cyr и Lat
        if (settings.count_type == "count_words") {
            document.querySelectorAll(".if-words").forEach(elem => elem.style.display = "inline");
            document.querySelectorAll(".if-symbols").forEach(elem => elem.style.display = "none");
        } else {
            document.querySelectorAll(".if-words").forEach(elem => elem.style.display = "none");
            document.querySelectorAll(".if-symbols").forEach(elem => elem.style.display = "inline");
        }
    } else {
        document.getElementById("table").style.display = "none";
        document.getElementById("clear").style.display = "inline";

        // Теперь, если данных нет, скрываем и подписи
        document.querySelectorAll(".if-words").forEach(elem => elem.style.display = "none");
        document.querySelectorAll(".if-symbols").forEach(elem => elem.style.display = "none");
    }

    // Проверяем домен страницы
    let isYonote = new URL(tab.url).hostname.endsWith(".yonote.ru");

    // Заменяем кнопку на обновление если это текущая страница или выключаем если это не Юнот
    let btn_add_record = document.getElementById("add-record");
    let btn_add_record_icon = btn_add_record.getElementsByTagName("use")[0];
    if (isUpdate) {
        btn_add_record_icon.setAttribute('href', '/icons.svg#sync');
    } else {
        btn_add_record_icon.setAttribute('href', '/icons.svg#plus');
        if (isYonote) {
            btn_add_record.classList.remove("disabled");
            btn_add_record.classList.add("action");
        } else {
            btn_add_record.classList.add("disabled");
            btn_add_record.classList.remove("action");
        }
    }

    // Включаем или выключаем кнопку дебага в настройках
    let btn_debug = document.getElementById("debug");
    if (isYonote) {
        btn_debug.classList.remove("disabled");
        btn_debug.classList.add("action");
    } else {
        btn_debug.classList.add("disabled");
        btn_debug.classList.remove("action");
    }
}

// Функция отрисовки записи
function renderRecord(record, title, value, selected) {
    let sel = selected ? "selected" : "";
    let btn = selected ? "remove-selected" : "remove";
    var div = document.createElement('div');
    div.innerHTML = `<div class="record ${sel}">
        <div class="button danger record-remove">
            <svg><use href="icons.svg#${btn}"></use></svg>
        </div>
        <div class="title">
            <span>${title}</span>
        </div>
        <div class="button action record-counter">
            <svg><use href="icons.svg#copy"></use></svg>
            ${value}
        </div>
    </div>`;
    div.getElementsByClassName("record-remove")[0].addEventListener('click', function() {
        removeRecord(record);
    });
    div.getElementsByClassName("record-counter")[0].addEventListener('click', function() {
        copyCounter(value);
    });
    
    return div.firstChild;
}

// Функция добавления записи
async function addRecord() {
    let tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    let settings = (await chrome.storage.local.get("settings")).settings;

    chrome.tabs.sendMessage(tab.id, settings, async function(response) {
        if (chrome.runtime.lastError || !response) {
            console.error("Failed to connect to the content script. Page error or script not loaded. Try reloading the page.");
            alert("Something went wrong on this page. Please reload it and try again.");
            return;
        }

        let records = (await chrome.storage.local.get("records")).records || {};
        records[tab.url] = {
            time: records[tab.url] != null ? records[tab.url].time : Date.now(),
            title: response.title,
            words: response.words,
            symbols: response.symbols,
            wordsCyrillic: response.wordsCyrillic,
            wordsLatin: response.wordsLatin,
            symbolsCyrillic: response.symbolsCyrillic,
            symbolsLatin: response.symbolsLatin
        };

        chrome.storage.local.set({ "records": records }).then(() => {
            renderMain();
        });
    });
}

// Функция удаления записи
async function removeRecord(url) {
    let records = (await chrome.storage.local.get("records")).records;
    delete records[url];
    chrome.storage.local.set({ "records": records });
    renderMain();
}

async function clearAll() {
    chrome.storage.local.set({ "records": {}, "history": {} }, function() {
        renderMain();
    });
}

// Функция коипрования счетчика отдельной записи
async function copyCounter(value) {
    navigator.clipboard.writeText(value);
}

// Функция коипрования общего счетчика
async function copyAll() {
    let fileName = document.querySelector(".record .title span")?.innerText || "Untitled";

    let settingsData = (await chrome.storage.local.get("settings")).settings || {};

    // Разделяем настройки на основные и форматирование
    let enabledMainSettings = [];
    let enabledFormattingSettings = [];

    Object.entries(settingsData).forEach(([key, value]) => {
        if (!value) return;
        let label = document.querySelector(`label[for="${key}"]`);
        if (label) {
            if (key.startsWith("allow_formatting")) {
                enabledFormattingSettings.push(label.innerText.trim());
            } else {
                enabledMainSettings.push(label.innerText.trim());
            }
        }
    });

    let copiedText = `File Name: ${fileName}\n` +
                     `Words/Symbols: ${document.getElementById("words-summary").innerText}\n` +
                     `Cyr: ${document.getElementById("cyr-summary").innerText}\n` +
                     `Lat: ${document.getElementById("lat-summary").innerText}\n` +
                     `Settings: ${enabledMainSettings.length ? enabledMainSettings.join(", ") : "None"}\n` +
                     `Formatting: ${enabledFormattingSettings.length ? enabledFormattingSettings.join(", ") : "None"}`;

    navigator.clipboard.writeText(copiedText);
}

// Рендер страницы настроек
async function renderSettings() {
    // Список заголовков для настроек связанных с разрешением подсчета
    let settings_title = [
        [ "allow_title", "Page title" ],
        [ "allow_table", "Table" ],
        [ "allow_text", "Text block" ],
        [ "allow_toggle_title", "Toggle title" ],
        [ "allow_callout", "Callout block" ],
        [ "allow_toggle_h1_title", "Toggle H1 title" ],
        [ "allow_to_do", "To-do list" ],
        [ "allow_toggle_h1_content", "Toggle H1 content" ],
        [ "allow_bulleted_list", "Bulleted list" ],
        [ "allow_toggle_h2_title", "Toggle H2 title" ],
        [ "allow_numbered_list", "Numbered list" ],
        [ "allow_toggle_h2_content", "Toggle H2 content" ],
        [ "allow_code", "Code block" ],
        [ "allow_toggle_h3_title", "Toggle H3 title" ],
        [ "allow_quote", "Quote block" ],
        [ "allow_toggle_h3_content", "Toggle H3 content" ],
        [ "allow_column", "Columns" ],
        [ "allow_toggle_content", "Toggle block" ],

    ];
    let settings_formatting_title = [
        [ "allow_formatting_bold", "Bold" ],
        [ "allow_formatting_italic", "Italic" ],
        [ "allow_formatting_underline", "Underline" ],
        [ "allow_formatting_strike", "Strike" ],
        [ "allow_formatting_code", "Code" ],
    ];
    
    chrome.storage.local.get("settings", function(data) {
        // Добавление настроек разрешений
        let settings_allow = document.getElementById("settings-allow");
        settings_allow.replaceChildren();
        for (let i = 0; i < settings_title.length; i++) {
            settings_allow.appendChild(renderSetting("checkbox",
                                                     settings_title[i][0],
                                                     settings_title[i][0],
                                                     settings_title[i][1],
                                                     data.settings[settings_title[i][0]]));
        }
        // Добавление настроек форматирования текста
        let settings_formatting = document.getElementById("settings-formatting");
        settings_formatting.replaceChildren();
        for (let i = 0; i < settings_formatting_title.length; i++) {
            settings_formatting.appendChild(renderSetting("checkbox",
                                                     settings_formatting_title[i][0],
                                                     settings_formatting_title[i][0],
                                                     settings_formatting_title[i][1],
                                                     data.settings[settings_formatting_title[i][0]]));
        }
        // Добавление настойки типа подсчета
        let settings_type = document.getElementById("settings-type");
        settings_type.replaceChildren();
        settings_type.appendChild(renderSetting("radio",
                                                "count_type",
                                                "count_words",
                                                "Words",
                                                data.settings["count_type"] == "count_words"));
        settings_type.appendChild(renderSetting("radio",
                                                "count_type",
                                                "count_symbols",
                                                "Symbols",
                                                data.settings["count_type"] == "count_symbols"));
    });
}

// Функция отрисовки настройки
function renderSetting(type, name, id, title, value) {
    let val = value ? "checked" : "";
    var div = document.createElement('div');
    div.innerHTML = `<div class="setting">
        <input type="${type}" id="${id}" name="${name}" ${val}/>
        <label for="${id}">
            <svg><use href="icons.svg#${type}-checked"></use></svg>
            <svg><use href="icons.svg#${type}"></use></svg>
            ${title}
        </label>
    </div>`;
    div.getElementsByTagName("input")[0].addEventListener('change', function() {
        let ckd = this.type == "checkbox" ? this.checked : this.id;
        chrome.storage.local.get("settings", function(data) {
            data.settings[name] = ckd;
            chrome.storage.local.set( { "settings" : data.settings } );
        });
    });
    
    return div.firstChild;
}

// Функция перехода к настройкам
function toSettings() {
    renderSettings();
    document.getElementById("main-page").style.display = "none";
    document.getElementById("settings-page").style.display = "inline";
}

// Функция перехода обратно на главную
function toMain() {
    renderMain();
    document.getElementById("main-page").style.display = "inline";
    document.getElementById("settings-page").style.display = "none";
}

// Ссылка на автора
function author() {
    window.open("http://t.me/shtopor_org", "_blank")
}