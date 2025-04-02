import * as log from "jsr:@std/log@0.218.2";
import { join } from "jsr:@std/path";

// Configure log levels based on environment
const isDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;

// Helper function to get caller location
function getCallerLocation() {
  const stack = new Error().stack?.split('\n')[3] || '';
  const match = stack.match(/at (.+?) \((.+?):(\d+):(\d+)\)/);
  if (match) {
    const [_, func, file, line, col] = match;
    return `${file.split('/').pop()}:${line} ${func}`;
  }
  return 'unknown location';
}

const handlers: Record<string, log.BaseHandler> = {
  console: new log.ConsoleHandler("DEBUG", {
    formatter: (record) => {
      const time = new Date().toISOString();
      const location = getCallerLocation();
      return `${time} ${record.levelName} [${location}] ${record.msg}`;
    },
  })
};

// Only add file handler in non-deployment environment
if (!isDeploy) {
  try {
    const logsDir = join(Deno.cwd(), "logs");
    await Deno.mkdir(logsDir, { recursive: true });
    
    handlers.file = new log.FileHandler("INFO", {
      filename: join(logsDir, "app.log"),
      formatter: (record) => {
        const time = new Date().toISOString();
        const location = getCallerLocation();
        return `${time} ${record.levelName} [${location}] ${record.msg}`;
      },
      mode: "a",
    });
  } catch (error) {
    console.warn("Failed to setup file logging:", error);
  }
}

// Configure log levels
await log.setup({
  handlers,
  loggers: {
    default: {
      level: "DEBUG",
      handlers: Object.keys(handlers),
    },
  },
});

const logger = log.getLogger();
logger.info(`Logger initialized in ${isDeploy ? 'deployment' : 'local'} mode`);

export { logger };