"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNamespacedLogger = exports.logger = exports.createLogger = void 0;
const winston_1 = __importDefault(require("winston"));
/**
 * Creates a new logger instance
 */
function createLogger(config = {}) {
    const { level = 'info', console = true, file, service = 'secondbrain' } = config;
    const transports = [];
    // Add console transport if enabled
    if (console) {
        transports.push(new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp(), winston_1.default.format.printf(({ timestamp, level, message, service, ...meta }) => {
                return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
            })),
        }));
    }
    // Add file transport if provided
    if (file) {
        transports.push(new winston_1.default.transports.File({
            filename: file,
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
        }));
    }
    // Create and return logger instance
    return winston_1.default.createLogger({
        level,
        defaultMeta: { service },
        transports,
    });
}
exports.createLogger = createLogger;
/**
 * Default logger instance
 */
exports.logger = createLogger();
/**
 * Creates a child logger with additional metadata
 * @param namespace The namespace for the logger
 * @param metadata Additional metadata
 */
function getNamespacedLogger(namespace, metadata = {}) {
    return exports.logger.child({
        namespace,
        ...metadata,
    });
}
exports.getNamespacedLogger = getNamespacedLogger;
