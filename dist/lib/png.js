"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePNG = exports.filterImagesBySizes = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
/**
 * Filter by size to the specified image information.
 * @param images Image file information.
 * @param sizes  Required sizes.
 * @return Filtered image information.
 */
const filterImagesBySizes = (images, sizes) => {
    return images
        .filter((image) => {
        return sizes.some((size) => {
            return image.size === size;
        });
    })
        .sort((a, b) => {
        return a.size - b.size;
    });
};
exports.filterImagesBySizes = filterImagesBySizes;
/**
 * Generate the PNG file.
 * @param svg SVG data that has been parse by svg2png.
 * @param size The size (width/height) of the image.
 * @param dir Path of the file output directory.
 * @param logger Logger.
 * @return Image generation task.
 */
const generate = async (svg, size, dir, logger) => {
    const dest = path_1.default.join(dir, size + '.png');
    logger.log('  Create: ' + dest);
    await (0, sharp_1.default)(svg)
        .png({ compressionLevel: 9 })
        .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
        .toFile(dest);
    return { size: size, filePath: dest };
};
/**
 * Generate the PNG files.
 * @param src Path of SVG file.
 * @param dir Output destination The path of directory.
 * @param sizes Required PNG image size.
 * @param logger Logger.
 */
const generatePNG = async (src, dir, sizes, logger) => {
    logger.log('SVG to PNG:');
    const svg = fs_1.default.readFileSync(src);
    const images = [];
    for (const size of sizes) {
        images.push(await generate(svg, size, dir, logger));
    }
    return images;
};
exports.generatePNG = generatePNG;
exports.default = exports.generatePNG;
