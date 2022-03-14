import pino from 'pino';
import pretty from 'pino-pretty';
import config from './config';

const logger = pino(
  {
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    level: 'trace', // Should be as low as possible so streams can choose
  },
  pino.multistream([
    {
      stream: pretty({
        translateTime: 'SYS:standard',
      }),
      level: (config.logLevel as pino.Level) || 'info',
    },
    {
      stream: pino.destination('config/log.log'),
      level: 'debug',
    },
  ])
);

export default logger;
