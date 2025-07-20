import winston from "winston";
import path from "path";
import fs from "fs";

const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

if (!isLambda) {
  const logDir = "logs";
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
}

class Logger {
  constructor() {
    const transports = [
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize({ all: true })),
      }),
    ];

    // Add file transports only if not in Lambda
    if (!isLambda) {
      transports.push(
        new winston.transports.File({
          filename: "logs/error.log",
          level: "error",
        })
      );
      transports.push(
        new winston.transports.File({
          filename: "logs/combined.log",
        })
      );
    }

    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, location }) => {
          return `${timestamp} [${level.toUpperCase()}] ${message} (${
            location || "unknown"
          })`;
        })
      ),
      transports,
    });
  }

  _log(level, message) {
    const stackTrace = new Error().stack;
    const callerLine = stackTrace.split("\n")[3]; // For class-based usage
    const match = callerLine?.match(/\((.*):\d+:\d+\)$/);
    const location = match ? path.relative(process.cwd(), match[1]) : "unknown";

    this.logger.log({
      level,
      message,
      location,
    });
  }

  info(message) {
    this._log("info", message);
  }

  warn(message) {
    this._log("warn", message);
  }

  error(message) {
    this._log("error", message);
  }

  debug(message) {
    this._log("debug", message);
  }
}

const logger = new Logger();
export default logger;
