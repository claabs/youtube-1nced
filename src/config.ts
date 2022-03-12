import fs from 'fs';

export interface AppConfig {
  channelId: string;
  messageSchedule?: string;
  logLevel?: string;
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  messageExp?: string;
  port?: number;
}

const configJson: AppConfig = JSON.parse(fs.readFileSync('config/config.json', 'utf-8'));
export default configJson;
