/**
 * Генератор иконок для Chrome-расширения
 *
 * Использование:
 *   node generate-icons.js
 *
 * Что делает:
 *   ✅ icon-*.png            — стандартные иконки
 *   ✅ icon-*-dark.png       — белые иконки для тёмной темы
 *   ✅ toolbar-icon-*.png    — иконки для тулбара
 *   ✅ toolbar-icon-*-dark.png — белые иконки для тулбара (тёмная тема)
 *
 * Исходные файлы:
 *   - images/icon.png
 *   - images/toolbar.png
 *
 * Зависимости:
 *   npm install sharp
 */


const sharp = require("sharp");
const fs = require("fs");

// Исходные файлы
const toolbarInputFile = "images/toolbar.png";
const iconInputFile = "images/icon.png";

// Размеры
const toolbarSizes = [16, 19, 24, 32, 38, 48, 128];
const iconSizes = [16, 32, 48, 64, 96, 128, 256, 512, 1024];

// Убедиться, что images/ существует
if (!fs.existsSync("images")) {
    fs.mkdirSync("images", { recursive: true });
}

// Создание тулбар-иконок (обычные и dark)
function createToolbarIcons(size) {
    sharp(toolbarInputFile)
        .resize(size, size)
        .toFile(`images/toolbar-icon-${size}.png`)
        .then(() => console.log(`✅ toolbar-icon-${size}.png`))
        .catch(err => console.error(err));

    sharp(toolbarInputFile)
        .resize(size, size)
        .negate({ alpha: false })
        .toFile(`images/toolbar-icon-${size}-dark.png`)
        .then(() => console.log(`✅ toolbar-icon-${size}-dark.png`))
        .catch(err => console.error(err));
}

// Создание основной иконки (обычная)
function createAppIcons(size) {
    sharp(iconInputFile)
        .resize(size, size)
        .toFile(`images/icon-${size}.png`)
        .then(() => console.log(`✅ icon-${size}.png`))
        .catch(err => console.error(err));
}

// Создание тёмной иконки (инвертированной)
function createDarkIcon(size) {
    sharp(iconInputFile)
        .resize(size, size)
        .negate({ alpha: false })
        .toFile(`images/icon-${size}-dark.png`)
        .then(() => console.log(`✅ icon-${size}-dark.png`))
        .catch(err => console.error(err));
}

// Принудительная перезапись icon.png
function replaceMainIcon() {
    sharp(iconInputFile)
        .resize(512, 512)
        .toFile("images/icon.png")
        .then(() => console.log(`✅ icon.png (main)`))
        .catch(err => console.error(err));
}

// Генерация
toolbarSizes.forEach(size => createToolbarIcons(size));
iconSizes.forEach(size => {
    createDarkIcon(size); 
    createAppIcons(size); 
});
replaceMainIcon();