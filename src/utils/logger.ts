import * as log from "jsr:@std/log@0.218.2";
import { join } from "jsr:@std/path";

const isDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;

const handlers: Record<string, log.BaseHandler> = {
  console: new log.ConsoleHandler("DEBUG", {
    formatter: (record) => {
      const time = new Date().toISOString();
      return `${time} ${record.levelName} ${record.msg}`;
    },
  })
};

if (!isDeploy) {
  try {
    const logsDir = join(Deno.cwd(), "logs");
    await Deno.mkdir(logsDir, { recursive: true });

    handlers.file = new log.FileHandler("INFO", {
      filename: join(logsDir, "app.log"),
      formatter: (record) => {
        const time = new Date().toISOString();
        return `${time} ${record.levelName} ${record.msg}`;
      },
      mode: "a",
    });
  } catch (error) {
    console.warn("Failed to setup file logging:", error);
  }
}

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