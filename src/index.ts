import 'source-map-support/register';
import { google } from 'googleapis';
import express from 'express';
import { createChatter, getChannelInfo } from './chat';
import config from './config';
import L from './logger';
import sessions from './sessions';

const { clientId, clientSecret, redirectUrl, channelId } = config;
const messageSchedule = config.messageSchedule || '*/5 * * * *';
const port = config.port || 6222;

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
const scope = ['https://www.googleapis.com/auth/youtube.force-ssl'];
const { pathname: redirectPath, origin: baseUrl } = new URL(redirectUrl);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope,
});

const app = express();

app.get('/', async (_req, res) => {
  res.redirect(authUrl);
});

app.get(redirectPath, async (req, res) => {
  const code = req.query.code as string;
  if (code) {
    L.debug({ code }, 'Received redirect code');
    const { tokens: credentials } = await oauth2Client.getToken(code);
    L.debug({ credentials }, 'Got credentials');
    const channelInfo = await getChannelInfo(credentials);
    L.debug({ channelInfo }, 'Got channel info');
    createChatter({
      credentials,
      channelInfo,
      channelId,
      messageSchedule,
    });
  }
  res.send('Logged in!');
});

app.listen(port);
L.debug(`Listening on port ${port}`);

L.info(`Login URL: ${baseUrl}`);

Object.values(sessions.JSON()).forEach(({ refreshToken, userId, userTitle }) =>
  createChatter({
    credentials: { refresh_token: refreshToken },
    channelInfo: { userId, userTitle },
    channelId,
    messageSchedule,
  })
);
