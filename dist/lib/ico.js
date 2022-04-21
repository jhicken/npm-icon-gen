"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUIRED_IMAGE_SIZES = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pngjs_1 = require("pngjs");
const png_1 = require("./png");
/** Sizes required for the ICO file. */
exports.REQUIRED_IMAGE_SIZES = [16, 24, 32, 48, 64, 128, 256];
/** Default name of ICO file. */
const DEFAULT_FILE_NAME = 'app';
/** File extension of ICO file. */
const FILE_EXTENSION = '.ico';
/** Size of the file header. */
const FILE_HEADER_SIZE = 6;
/** Size of the icon directory. */
const ICO_DIRECTORY_SIZE = 16;
/** Size of the `BITMAPINFOHEADER`. */
const BITMAPINFOHEADER_SIZE = 40;
/** Color mode of `BITMAPINFOHEADER`.*/
const BI_RGB = 0;
/** BPP (Bit Per Pixel) for Alpha PNG (RGB = 4). */
const BPP_ALPHA = 4;
/**
 * Convert a PNG of the byte array to the DIB (Device Independent Bitmap) format.
 * PNG in color RGBA (and more), the coordinate structure is the Top/Left to Bottom/Right.
 * DIB in color BGRA, the coordinate structure is the Bottom/Left to Top/Right.
 * @param src Target image.
 * @param width The width of the image.
 * @param height The height of the image.
 * @param bpp The bit per pixel of the image.
 * @return Converted image
 * @see https://en.wikipedia.org/wiki/BMP_file_format
 */
const convertPNGtoDIB = (src, width, height, bpp) => {
    const cols = width * bpp;
    const rows = height * cols;
    const rowEnd = rows - cols;
    const dest = Buffer.alloc(src.length);
    for (let row = 0; row < rows; row += cols) {
        for (let col = 0; col < cols; col += bpp) {
            // RGBA: Top/Left -> Bottom/Right
            let pos = row + col;
            const r = src.readUInt8(pos);
            const g = src.readUInt8(pos + 1);
            const b = src.readUInt8(pos + 2);
            const a = src.readUInt8(pos + 3);
            // BGRA: Right/Left -> Top/Right
            pos = rowEnd - row + col;
            dest.writeUInt8(b, pos);
            dest.writeUInt8(g, pos + 1);
            dest.writeUInt8(r, pos + 2);
            dest.writeUInt8(a, pos + 3);
        }
    }
    return dest;
};
/**
 * Create the `BITMAPINFOHEADER`.
 * @param png PNG image.
 * @param compression Compression mode
 * @return `BITMAPINFOHEADER` data.
 * @see https://msdn.microsoft.com/ja-jp/library/windows/desktop/dd183376%28v=vs.85%29.aspx
 */
const createBitmapInfoHeader = (png, compression) => {
    const b = Buffer.alloc(BITMAPINFOHEADER_SIZE);
    b.writeUInt32LE(BITMAPINFOHEADER_SIZE, 0); // 4 DWORD biSize
    b.writeInt32LE(png.width, 4); // 4 LONG  biWidth
    b.writeInt32LE(png.height * 2, 8); // 4 LONG  biHeight
    b.writeUInt16LE(1, 12); // 2 WORD  biPlanes
    b.writeUInt16LE(BPP_ALPHA * 8, 14); // 2 WORD  biBitCount
    b.writeUInt32LE(compression, 16); // 4 DWORD biCompression
    b.writeUInt32LE(png.data.length, 20); // 4 DWORD biSizeImage
    b.writeInt32LE(0, 24); // 4 LONG  biXPelsPerMeter
    b.writeInt32LE(0, 28); // 4 LONG  biYPelsPerMeter
    b.writeUInt32LE(0, 32); // 4 DWORD biClrUsed
    b.writeUInt32LE(0, 36); // 4 DWORD biClrImportant
    return b;
};
/**
 * Create the Icon entry.
 * @param png PNG image.
 * @param offset The offset of directory data from the beginning of the ICO/CUR file
 * @return Directory data.
 *
 * @see https://msdn.microsoft.com/en-us/library/ms997538.aspx
 */
const createDirectory = (png, offset) => {
    const b = Buffer.alloc(ICO_DIRECTORY_SIZE);
    const size = png.data.length + BITMAPINFOHEADER_SIZE;
    const width = 256 <= png.width ? 0 : png.width;
    const height = 256 <= png.height ? 0 : png.height;
    const bpp = BPP_ALPHA * 8;
    b.writeUInt8(width, 0); // 1 BYTE  Image width
    b.writeUInt8(height, 1); // 1 BYTE  Image height
    b.writeUInt8(0, 2); // 1 BYTE  Colors
    b.writeUInt8(0, 3); // 1 BYTE  Reserved
    b.writeUInt16LE(1, 4); // 2 WORD  Color planes
    b.writeUInt16LE(bpp, 6); // 2 WORD  Bit per pixel
    b.writeUInt32LE(size, 8); // 4 DWORD Bitmap (DIB) size
    b.writeUInt32LE(offset, 12); // 4 DWORD Offset
    return b;
};
/**
 * Create the ICO file header.
 * @param count Specifies number of images in the file.
 * @return Header data.
 * @see https://msdn.microsoft.com/en-us/library/ms997538.aspx
 */
const createFileHeader = (count) => {
    const b = Buffer.alloc(FILE_HEADER_SIZE);
    b.writeUInt16LE(0, 0); // 2 WORD Reserved
    b.writeUInt16LE(1, 2); // 2 WORD Type
    b.writeUInt16LE(count, 4); // 2 WORD Image count
    return b;
};
/**
 * Read PNG data from image files.
 * @param images Information of image files.
 * @param sizes Target size of image.
 * @returns PNG data.
 */
const readPNGs = (images, sizes) => {
    const targets = (0, png_1.filterImagesBySizes)(images, sizes);
    return targets.map((image) => {
        const data = fs_1.default.readFileSync(image.filePath);
        return pngjs_1.PNG.sync.read(data);
    });
};
/**
 * Write ICO directory information to the stream.
 * @param pngs PNG data.
 * @param stream Stream to write.
 */
const writeDirectories = (pngs, stream) => {
    let offset = FILE_HEADER_SIZE + ICO_DIRECTORY_SIZE * pngs.length;
    for (const png of pngs) {
        const directory = createDirectory(png, offset);
        stream.write(directory, 'binary');
        offset += png.data.length + BITMAPINFOHEADER_SIZE;
    }
};
/**
 * Write PNG data to the stream.
 * @param pngs PNG data.
 * @param stream Stream to write.
 */
const writePNGs = (pngs, stream) => {
    for (const png of pngs) {
        const header = createBitmapInfoHeader(png, BI_RGB);
        stream.write(header, 'binary');
        const dib = convertPNGtoDIB(png.data, png.width, png.height, BPP_ALPHA);
        stream.write(dib, 'binary');
    }
};
/**
 * Create an ICO file.
 * @param pngs Information of PNG images.
 * @param filePath The path of the output destination file.
 * @return Asynchronous task.
 */
const createIconFile = (pngs, filePath) => {
    return new Promise((resolve, reject) => {
        if (pngs.length === 0) {
            return reject(new Error('There was no PNG file matching the specified size.'));
        }
        const stream = fs_1.default.createWriteStream(filePath);
        // https://stackoverflow.com/questions/12906694/fs-createwritestream-does-not-immediately-create-file
        stream.on('ready', () => {
            stream.write(createFileHeader(pngs.length), 'binary');
            writeDirectories(pngs, stream);
            writePNGs(pngs, stream);
            stream.end();
        });
        stream.on('error', (err) => reject(err));
        // https://stackoverflow.com/questions/46752428/do-i-need-await-fs-createwritestream-in-pipe-method-in-node
        stream.on('finish', () => resolve());
    });
};
/**
 * Generate the ICO file from a PNG images.
 * @param images File information.
 * @param dir Output destination the path of directory.
 * @param logger Logger.
 * @param options Options.
 * @return Path of the generated ICO file.
 */
const generateICO = async (images, dir, logger, options) => {
    logger.log('ICO:');
    const opt = {
        name: options.name && options.name !== '' ? options.name : DEFAULT_FILE_NAME,
        sizes: options.sizes && 0 < options.sizes.length
            ? options.sizes
            : exports.REQUIRED_IMAGE_SIZES
    };
    const dest = path_1.default.join(dir, opt.name + FILE_EXTENSION);
    try {
        const pngs = readPNGs(images, opt.sizes);
        await createIconFile(pngs, dest);
    }
    catch (err) {
        fs_1.default.unlinkSync(dest);
        throw err;
    }
    logger.log('  Create: ' + dest);
    return dest;
};
exports.default = generateICO;
