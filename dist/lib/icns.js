"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugUnpackIconBlocks = exports.REQUIRED_IMAGE_SIZES = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const pngjs_1 = require("pngjs");
const rle_1 = require("./rle");
const png_1 = require("./png");
const readFileAsync = util_1.default.promisify(fs_1.default.readFile);
const writeFileASync = util_1.default.promisify(fs_1.default.writeFile);
/**
 * Sizes required for the ICNS file.
 * @type {Array}
 */
exports.REQUIRED_IMAGE_SIZES = [16, 32, 64, 128, 256, 512, 1024];
/**
 * The size of the ICNS header.
 * @type {Number}
 */
const HEADER_SIZE = 8;
/**
 * Identifier of the ICNS file, in ASCII "icns".
 * @type {Number}
 */
const FILE_HEADER_ID = 'icns';
/**
 * Default file name.
 * @type {String}
 */
const DEFAULT_FILE_NAME = 'app';
/**
 * ICNS file extension.
 * @type {String}
 */
const FILE_EXTENSION = '.icns';
/**
 * Information of the images, Mac OS 8.x (il32, is32, l8mk, s8mk) is unsupported.
 * If icp4, icp5, icp6 is present, Icon will not be supported because it can not be set as Folder of Finder.
 */
const ICON_INFOS = [
    // Normal
    { type: 'ic07', size: 128 },
    { type: 'ic08', size: 256 },
    { type: 'ic09', size: 512 },
    { type: 'ic10', size: 1024 },
    // Retina
    { type: 'ic11', size: 32 },
    { type: 'ic12', size: 64 },
    { type: 'ic13', size: 256 },
    { type: 'ic14', size: 512 },
    // Mac OS 8.5
    { type: 'is32', mask: 's8mk', size: 16 },
    { type: 'il32', mask: 'l8mk', size: 32 }
];
/**
 * Select the support image from the icon size.
 * @param size Size of icon.
 * @param images File information.
 * @return If successful image information, otherwise null.
 */
const imageFromIconSize = (size, images) => {
    for (const image of images) {
        if (image.size === size) {
            return image;
        }
    }
    return null;
};
/**
 * Create the ICNS file header.
 * @param fileSize File size.
 * @return Header data.
 */
const createFileHeader = (fileSize) => {
    const buffer = Buffer.alloc(HEADER_SIZE);
    buffer.write(FILE_HEADER_ID, 0, 'ascii');
    buffer.writeUInt32BE(fileSize, 4);
    return buffer;
};
/**
 * Create the Icon header in ICNS file.
 * @param type Type of the icon.
 * @param imageSize Size of the image data.
 * @return Header data.
 */
const createIconHeader = (type, imageSize) => {
    const buffer = Buffer.alloc(HEADER_SIZE);
    buffer.write(type, 0, 'ascii');
    buffer.writeUInt32BE(HEADER_SIZE + imageSize, 4);
    return buffer;
};
/**
 * Create a color and mask data.
 * @param image Binary of image file.
 * @return Pack bit bodies.
 */
const createIconBlockPackBitsBodies = (image) => {
    const png = pngjs_1.PNG.sync.read(image);
    const results = { colors: [], masks: [] };
    const r = [];
    const g = [];
    const b = [];
    for (let i = 0, max = png.data.length; i < max; i += 4) {
        // RGB
        r.push(png.data.readUInt8(i));
        g.push(png.data.readUInt8(i + 1));
        b.push(png.data.readUInt8(i + 2));
        // Alpha
        results.masks.push(png.data.readUInt8(i + 3));
    }
    // Compress
    results.colors = results.colors.concat((0, rle_1.packICNS)(r));
    results.colors = results.colors.concat((0, rle_1.packICNS)(g));
    results.colors = results.colors.concat((0, rle_1.packICNS)(b));
    return results;
};
/**
 * Create an icon block's data.
 * @param type Type of the icon.
 * @param image Binary of image file.
 * @return Binary of icon block.
 */
const createIconBlockData = (type, image) => {
    const header = createIconHeader(type, image.length);
    return Buffer.concat([header, image], header.length + image.length);
};
/**
 * Create an icon blocks (Color and mask) for PackBits.
 * @param type Type of the icon in color block.
 * @param mask Type of the icon in mask block.
 * @param image Binary of image file.
 * @return Binary of icon block.
 */
const createIconBlockPackBits = (type, mask, image) => {
    const bodies = createIconBlockPackBitsBodies(image);
    const colorBlock = createIconBlockData(type, Buffer.from(bodies.colors));
    const maskBlock = createIconBlockData(mask, Buffer.from(bodies.masks));
    return Buffer.concat([colorBlock, maskBlock], colorBlock.length + maskBlock.length);
};
/**
 * Create an icon block.
 * @param info Icon information in ICNS.
 * @param filePath Path of image (PNG) file.
 * @return Binary of icon block.
 */
const createIconBlock = async (info, filePath) => {
    const image = await readFileAsync(filePath);
    switch (info.type) {
        case 'is32':
        case 'il32':
            return createIconBlockPackBits(info.type, info.mask || '', image);
        default:
            return createIconBlockData(info.type, image);
    }
};
/**
 * Create the ICNS file body on memory buffer.
 * @param images Information of the image files.
 * @returns Body of ICNS file.
 */
const createFileBody = async (images) => {
    let body = Buffer.alloc(0);
    for (const info of ICON_INFOS) {
        const image = imageFromIconSize(info.size, images);
        if (!image) {
            // Depending on the command line option, there may be no corresponding size
            continue;
        }
        const block = await createIconBlock(info, image.filePath);
        body = Buffer.concat([body, block], body.length + block.length);
    }
    return body;
};
/**
 * Create an ICNS file.
 * @param images Information of the image files.
 * @param filePath The path of the output destination file.
 * @return Asynchronous task.
 */
const createIconFile = async (images, filePath) => {
    // Write images on memory buffer
    const body = await createFileBody(images);
    if (body.length === 0) {
        throw new Error('Failed to create the body of the file. The size is `0`.');
    }
    // Write file header and body
    return new Promise((resolve, reject) => {
        const stream = fs_1.default.createWriteStream(filePath);
        // https://stackoverflow.com/questions/12906694/fs-createwritestream-does-not-immediately-create-file
        stream.on('ready', () => {
            stream.write(createFileHeader(body.length + HEADER_SIZE), 'binary');
            stream.write(body, 'binary');
            stream.end();
        });
        stream.on('error', (err) => reject(err));
        // https://stackoverflow.com/questions/46752428/do-i-need-await-fs-createwritestream-in-pipe-method-in-node
        stream.on('finish', () => resolve());
    });
};
/**
 * Unpack an icon block files from ICNS file (For debug).
 * @param src Path of the ICNS file.
 * @param dest Path of directory to output icon block files.
 * @return Asynchronous task.
 */
const debugUnpackIconBlocks = async (src, dest) => {
    const data = await readFileAsync(src);
    for (let pos = HEADER_SIZE, max = data.length; pos < max;) {
        const header = data.slice(pos, pos + HEADER_SIZE);
        const type = header.toString('ascii', 0, 4);
        const size = header.readUInt32BE(4) - HEADER_SIZE;
        pos += HEADER_SIZE;
        const body = data.slice(pos, pos + size);
        await writeFileASync(path_1.default.join(dest, `${type}.header`), header, 'binary');
        await writeFileASync(path_1.default.join(dest, `${type}.body`), body, 'binary');
        pos += size;
    }
};
exports.debugUnpackIconBlocks = debugUnpackIconBlocks;
/**
 * Create the ICNS file from a PNG images.
 * @param images Information of the image files.
 * @param dir Output destination the path of directory.
 * @param logger Logger.
 * @param options Options.
 * @return Path of generated ICNS file.
 */
const generateICNS = async (images, dir, logger, options) => {
    logger.log('ICNS:');
    const opt = {
        name: options.name && options.name !== '' ? options.name : DEFAULT_FILE_NAME,
        sizes: options.sizes && 0 < options.sizes.length
            ? options.sizes
            : exports.REQUIRED_IMAGE_SIZES
    };
    const dest = path_1.default.join(dir, opt.name + FILE_EXTENSION);
    try {
        const targets = (0, png_1.filterImagesBySizes)(images, opt.sizes);
        await createIconFile(targets, dest);
    }
    catch (err) {
        fs_1.default.unlinkSync(dest);
        throw err;
    }
    logger.log('  Create: ' + dest);
    return dest;
};
exports.default = generateICNS;
