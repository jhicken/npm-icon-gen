"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePNG = exports.REQUIRED_IMAGE_SIZES = exports.REQUIRED_ICO_SIZES = exports.REQUIRED_PNG_SIZES = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ico_1 = __importDefault(require("./ico"));
const png_1 = require("./png");
/** Sizes required for the PNG files. */
exports.REQUIRED_PNG_SIZES = [32, 57, 72, 96, 120, 128, 144, 152, 195, 228];
/** Sizes required for ICO file. */
exports.REQUIRED_ICO_SIZES = [16, 24, 32, 48, 64];
/** Sizes required for Favicon files. */
exports.REQUIRED_IMAGE_SIZES = exports.REQUIRED_PNG_SIZES.concat(exports.REQUIRED_ICO_SIZES)
    .filter((a, i, self) => self.indexOf(a) === i)
    .sort((a, b) => a - b);
/** File name of Favicon file. */
const ICO_FILE_NAME = 'favicon';
/** Prefix of PNG file names. */
const PNG_FILE_NAME_PREFIX = 'favicon-';
/**
 * Copy to image.
 * @param image Image information.
 * @param dir Output destination The path of directory.
 * @param prefix Prefix of an output PNG files. Start with the alphabet, can use `-` and `_`. This option is for PNG. The name of the ICO file is always `favicon.ico`.
 * @param logger Logger.
 * @return Path of generated PNG file.
 */
const copyImage = (image, dir, prefix, logger) => {
    return new Promise((resolve, reject) => {
        const reader = fs_1.default.createReadStream(image.filePath).on('error', (err) => {
            reject(err);
        });
        const dest = path_1.default.join(dir, `${prefix}${image.size}.png`);
        const writer = fs_1.default
            .createWriteStream(dest)
            .on('error', (err) => {
            reject(err);
        })
            .on('close', () => {
            logger.log('  Create: ' + dest);
            resolve(dest);
        });
        reader.pipe(writer);
    });
};
/**
 * Generate the FAVICON PNG file from the PNG images.
 * @param images File information for the PNG files generation.
 * @param dir Output destination the path of directory.
 * @param prefix Prefix of an output PNG files. Start with the alphabet, can use `-` and `_`. This option is for PNG. The name of the ICO file is always `favicon.ico`.
 * @param sizes Size structure of PNG files to output.
 * @param logger Logger.
 * @return Path of the generated files.
 */
const generatePNG = async (images, dir, prefix, sizes, logger) => {
    logger.log('Favicon:');
    const targets = (0, png_1.filterImagesBySizes)(images, sizes);
    const results = [];
    for (const image of targets) {
        results.push(await copyImage(image, dir, prefix, logger));
    }
    return results;
};
exports.generatePNG = generatePNG;
/**
 * Generate a FAVICON image files (ICO and PNG) from the PNG images.
 * @param images File information for the PNG files generation.
 * @param dir Output destination the path of directory.
 * @param logger Logger.
 * @param options Options.
 * @return Path of the generated files.
 */
const generateFavicon = async (images, dir, logger, options) => {
    const opt = {
        name: options.name && options.name !== '' ? options.name : PNG_FILE_NAME_PREFIX,
        pngSizes: options.pngSizes && 0 < options.pngSizes.length
            ? options.pngSizes
            : exports.REQUIRED_PNG_SIZES,
        icoSizes: options.icoSizes && 0 < options.icoSizes.length
            ? options.icoSizes
            : exports.REQUIRED_ICO_SIZES
    };
    const results = await (0, exports.generatePNG)(images, dir, opt.name, opt.pngSizes, logger);
    results.push(await (0, ico_1.default)((0, png_1.filterImagesBySizes)(images, opt.icoSizes), dir, logger, {
        name: ICO_FILE_NAME,
        sizes: opt.icoSizes
    }));
    return results;
};
exports.default = generateFavicon;
