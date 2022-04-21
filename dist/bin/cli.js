"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArgv = void 0;
const commander_1 = __importDefault(require("commander"));
const index_1 = __importDefault(require("../lib/index"));
/**
 * Parse the part related to icon generation from options obtained by commander.
 * @param opts Options obtained by commander.
 * @returns Options of the icon generation.
 */
const parseIconOptions = (opts) => {
    const results = { report: !!opts.report };
    if (opts.ico) {
        results.ico = {};
        if (opts.icoName) {
            results.ico.name = opts.icoName;
        }
        if (opts.icoSizes) {
            results.ico.sizes = opts.icoSizes;
        }
    }
    if (opts.icns) {
        results.icns = {};
        if (opts.icnsName) {
            results.icns.name = opts.icnsName;
        }
        if (opts.icnsSizes) {
            results.icns.sizes = opts.icnsSizes;
        }
    }
    if (opts.favicon) {
        results.favicon = {};
        if (opts.faviconName) {
            results.favicon.name = opts.faviconName;
        }
        if (opts.faviconPngSizes) {
            results.favicon.pngSizes = opts.faviconPngSizes;
        }
        if (opts.faviconIcoSizes) {
            results.favicon.icoSizes = opts.faviconIcoSizes;
        }
    }
    // Generate all with default settings
    if (!(results.ico || results.icns || results.favicon)) {
        results.ico = {};
        results.icns = {};
        results.favicon = {};
    }
    return results;
};
/**
 * Parse the sizes specification.
 * @param arg Argument of command line interface.
 * @returns Size of PNG images.
 */
const parseSizes = (arg) => {
    return arg.split(',').map((n) => Number(n));
};
/**
 * Parse the arguments of command line interface.
 * @param argv Arguments of command line interface.
 * @returns Parsed options.
 */
const parseArgv = (argv) => {
    const program = new commander_1.default.Command();
    program
        .usage('icon-gen [options]')
        .description('Generate an icon from the SVG or PNG file.\nIf "--ico", "--icns", "--favicon" is not specified, everything is output in the standard setting.')
        .option('-i, --input <Path>', 'Path of the SVG file or PNG file directory.')
        .option('-o, --output <Path>', 'Path of the output directory.')
        .option('-r, --report', 'Display the process reports, default is disable.')
        .option('--ico', 'Output ICO file with default settings, option is "--ico-*".')
        .option('--ico-name <Name>', 'ICO file name to output.')
        .option('--ico-sizes [Sizes]', 'PNG size list to structure ICO file', parseSizes)
        .option('--icns', 'Output ICNS file with default settings, option is "--icns-*".')
        .option('--icns-name <Name>', 'ICO file name to output.')
        .option('--icns-sizes [Sizes]', 'PNG size list to structure ICNS file', parseSizes)
        .option('--favicon', 'Output Favicon files with default settings, option is "--favicon-*".')
        .option('--favicon-name <Name>', 'prefix of the PNG file. Start with the alphabet, can use "-" and "_"')
        .option('--favicon-png-sizes [Sizes]', 'Sizes of the Favicon PNG files', parseSizes)
        .option('--favicon-ico-sizes [Sizes]', 'PNG size list to structure Favicon ICO file', parseSizes)
        .version(require('../../package.json').version, '-v, --version');
    program.on('--help', () => {
        console.log(`
Examples:
  $ icon-gen -i sample.svg -o ./dist -r
  $ icon-gen -i ./images -o ./dist -r
  $ icon-gen -i sample.svg -o ./dist --ico --icns
  $ icon-gen -i sample.svg -o ./dist --ico --ico-name sample --ico-sizes 16,32
  $ icon-gen -i sample.svg -o ./dist --icns --icns-name sample --icns-sizes 16,32
  $ icon-gen -i sample.svg -o ./dist --favicon --favicon-name=favicon- --favicon-png-sizes 16,32,128 --favicon-ico-sizes 16,32

See also:
  https://github.com/akabekobeko/npm-icon-gen`);
    });
    // Print help and exit if there are no arguments
    if (argv.length < 3) {
        program.help();
    }
    program.parse(argv);
    const opts = program.opts();
    return {
        input: opts.input,
        output: opts.output,
        icon: parseIconOptions(opts)
    };
};
exports.parseArgv = parseArgv;
/**
 * Run the tool based on command line arguments.
 * @param argv Arguments of command line interface.
 * @returns Path of generated files.
 */
const exec = (argv) => {
    const options = (0, exports.parseArgv)(argv);
    return (0, index_1.default)(options.input, options.output, options.icon);
};
exports.default = exec;
