#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cli_js_1 = __importDefault(require("./cli.js"));
(0, cli_js_1.default)(process.argv).catch((err) => {
    console.error(err);
});
