import * as log from "jsr:@std/log@^0.219.0";
import {  join } from "jsr:@std/path";

// Get the current working directory
const cwd = Deno.cwd();
const logsDir = join(cwd, "logs");

// Ensure logs directory exists with proper permissions
try {
  await Deno.stat(logsDir);
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    await Deno.mkdir(logsDir, { recursive: true, mode: 0o755 });
  }
}

const logFile = join(logsDir, "app.log");
console.log(`Log file: ${logFile}`);
// Configure log levels
await log.setup({
  handlers: {
    console: new log.ConsoleHandler("DEBUG", {
      formatter: (record) => {
        const time = new Date().toISOString();
        return `${time} ${record.levelName} ${record.msg}`;
      },
    }),
    file: new log.FileHandler("INFO", {
      filename: logFile,
      formatter: (record) => {
        const time = new Date().toISOString();
        return `${time} ${record.levelName} ${record.msg}`;
      },
      mode: "a", // Append mode
    }),
  },
  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["console", "file"],
    },
  },
});

// Get the logger instance
const logger = log.getLogger();

// Test log write
logger.info("Logger initialized");

export { logger };