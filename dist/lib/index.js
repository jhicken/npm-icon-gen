"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const del_1 = __importDefault(require("del"));
const os_1 = __importDefault(require("os"));
const uuid_1 = require("uuid");
const mkdirp_1 = __importDefault(require("mkdirp"));
const png_1 = __importDefault(require("./png"));
const ico_1 = __importStar(require("./ico"));
const icns_1 = __importStar(require("./icns"));
const favicon_1 = __importStar(require("./favicon"));
const logger_1 = __importDefault(require("./logger"));
/**
 * Filter the sizes.
 * @param sizes Original sizes.
 * @param filterSizes Filter sizes.
 * @return filtered sizes.
 */
const filterSizes = (sizes = [], filterSizes = []) => {
    if (filterSizes.length === 0) {
        return sizes;
    }
    return sizes.filter((size) => {
        for (let filterSize of filterSizes) {
            if (size === filterSize) {
                return true;
            }
        }
        return false;
    });
};
/**
 * Gets the size of the images needed to create an icon.
 * @param options Options from command line.
 * @return The sizes of the image.
 */
const getRequiredPNGImageSizes = (options) => {
    let sizes = [];
    if (options.icns) {
        sizes = sizes.concat(filterSizes(icns_1.REQUIRED_IMAGE_SIZES, options.icns.sizes));
    }
    if (options.ico) {
        sizes = sizes.concat(filterSizes(ico_1.REQUIRED_IMAGE_SIZES, options.ico.sizes));
    }
    if (options.favicon) {
        if (options.favicon.pngSizes) {
            // Favicon PNG generates the specified size as it is
            sizes = sizes.concat(options.favicon.pngSizes);
        }
        else {
            sizes = sizes.concat(favicon_1.REQUIRED_IMAGE_SIZES);
        }
    }
    // 'all' mode
    if (sizes.length === 0) {
        sizes = favicon_1.REQUIRED_IMAGE_SIZES.concat(icns_1.REQUIRED_IMAGE_SIZES).concat(ico_1.REQUIRED_IMAGE_SIZES);
    }
    // Always ensure the ascending order
    return sizes
        .filter((value, index, array) => array.indexOf(value) === index)
        .sort((a, b) => a - b);
};
/**
 * Generate an icon files.
 * @param images Image file information.
 * @param dest Destination directory path.
 * @param options Options.
 * @param logger Logger.
 * @return Path of generated files.
 */
const generate = async (images, dest, options, logger) => {
    if (!(images && 0 < images.length)) {
        throw new Error('Targets is empty.');
    }
    const dir = path_1.default.resolve(dest);
    mkdirp_1.default.sync(dir);
    const results = [];
    if (options.icns) {
        results.push(await (0, icns_1.default)(images, dir, logger, options.icns));
    }
    if (options.ico) {
        results.push(await (0, ico_1.default)(images, dir, logger, options.ico));
    }
    if (options.favicon) {
        const files = await (0, favicon_1.default)(images, dir, logger, options.favicon);
        for (const file of files) {
            results.push(file);
        }
    }
    return results;
};
/**
 * Generate an icon from PNG file.
 * @param src Path of the PNG files directory.
 * @param dir Path of the output files directory.
 * @param options Options.
 * @param logger  Logger.
 * @return Path of output files.
 */
const generateIconFromPNG = (src, dir, options, logger) => {
    const pngDirPath = path_1.default.resolve(src);
    const destDirPath = path_1.default.resolve(dir);
    logger.log('Icon generator from PNG:');
    logger.log('  src: ' + pngDirPath);
    logger.log('  dir: ' + destDirPath);
    const images = getRequiredPNGImageSizes(options)
        .map((size) => {
        return path_1.default.join(pngDirPath, size + '.png');
    })
        .map((filePath) => {
        const size = Number(path_1.default.basename(filePath, '.png'));
        return { filePath, size };
    });
    let notExistsFile = null;
    images.some((image) => {
        const stat = fs_1.default.statSync(image.filePath);
        if (!(stat && stat.isFile())) {
            notExistsFile = path_1.default.basename(image.filePath);
            return true;
        }
        return false;
    });
    if (notExistsFile) {
        throw new Error('"' + notExistsFile + '" does not exist.');
    }
    return generate(images, dir, options, logger);
};
/**
 * Generate an icon from SVG file.
 * @param src Path of the SVG file.
 * @param dir Path of the output files directory.
 * @param options Options from command line.
 * @param logger  Logger.
 * @return Path of generated files.
 */
const generateIconFromSVG = async (src, dir, options, logger) => {
    const svgFilePath = path_1.default.resolve(src);
    const destDirPath = path_1.default.resolve(dir);
    logger.log('Icon generator from SVG:');
    logger.log('  src: ' + svgFilePath);
    logger.log('  dir: ' + destDirPath);
    const workDir = path_1.default.join(os_1.default.tmpdir(), (0, uuid_1.v4)());
    fs_1.default.mkdirSync(workDir);
    if (!fs_1.default.existsSync(workDir)) {
        throw new Error('Failed to create the working directory.');
    }
    try {
        const images = await (0, png_1.default)(svgFilePath, workDir, getRequiredPNGImageSizes(options), logger);
        const results = await generate(images, destDirPath, options, logger);
        del_1.default.sync([workDir], { force: true });
        return results;
    }
    catch (err) {
        del_1.default.sync([workDir], { force: true });
        throw err;
    }
};
/**
 * Generate an icon from SVG or PNG file.
 * @param src Path of the SVG file.
 * @param dest Path of the output files directory.
 * @param options Options.
 * @return Path of generated files.
 */
const generateIcon = async (src, dest, options = { ico: {}, icns: {}, favicon: {}, report: false }) => {
    if (!fs_1.default.existsSync(src)) {
        throw new Error('Input file or directory is not found.');
    }
    if (!fs_1.default.existsSync(dest)) {
        throw new Error('Output directory is not found.');
    }
    // Output all by default if no icon is specified
    if (!(options.ico || options.icns || options.favicon)) {
        options.ico = {};
        options.icns = {};
        options.favicon = {};
    }
    const logger = new logger_1.default(options.report);
    if (fs_1.default.statSync(src).isDirectory()) {
        return generateIconFromPNG(src, dest, options, logger);
    }
    else {
        return generateIconFromSVG(src, dest, options, logger);
    }
};
exports.default = generateIcon;
module.exports = generateIcon;
