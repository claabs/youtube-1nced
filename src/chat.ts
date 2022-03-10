import { google } from 'googleapis';
import schedule from 'node-schedule';
import type { Logger } from 'pino';
import { Credentials } from 'google-auth-library';
import logger from './logger';
import config from './config';
import sessions from './sessions';

export interface ChannelInfo {
  userId: string;
  userTitle: string;
}

export interface YouTubeChatterProps {
  credentials: Credentials;
  channelInfo: ChannelInfo;
  channelId: string;
  messageSchedule: string;
}

const { clientId, clientSecret } = config;

const MAX_SEND_ATTEMPTS = 2;

class YouTubeChatter {
  private chatChannelId: string;

  public userId: string;

  private userTitle: string;

  private youtube;

  private oauth2Client = new google.auth.OAuth2(clientId, clientSecret);

  private L: Logger;

  private chatId?: string;

  private messageText = '1';

  constructor(props: YouTubeChatterProps) {
    this.chatChannelId = props.channelId;
    this.userId = props.channelInfo.userId;
    this.userTitle = props.channelInfo.userTitle;
    this.oauth2Client.setCredentials(props.credentials);
    this.youtube = google.youtube({
      auth: this.oauth2Client,
      version: 'v3',
    });
    this.L = logger.child({
      userId: this.userId,
      userTitle: this.userTitle,
      chatChannelId: this.chatChannelId,
    });

    schedule.scheduleJob('sendMessage', props.messageSchedule, this.sendMessage.bind(this));
    this.oauth2Client.on('tokens', this.onTokens.bind(this));

    this.onTokens(props.credentials);
    this.L.info('Chatbot scheduled');
  }

  private onTokens(tokens: Credentials): void {
    const refreshToken = tokens.refresh_token;
    if (refreshToken) {
      this.L.debug('Saving new refresh token');
      const { userTitle, userId } = this;
      sessions.set(userId, {
        userId,
        userTitle,
        refreshToken,
      });
    }
  }

  private async sendMessage(fireDate: Date, attempt = 1): Promise<void> {
    if (attempt > MAX_SEND_ATTEMPTS) {
      this.L.error(`Giving up sending message after ${MAX_SEND_ATTEMPTS} attempt(s)`);
      return;
    }
    const chatId = await this.getChatId();
    if (!chatId) {
      this.L.warn('Could not get chatId for channel livestream');
      return;
    }
    try {
      await this.youtube.liveChatMessages.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            liveChatId: chatId,
            type: 'textMessageEvent',
            textMessageDetails: {
              messageText: this.messageText,
            },
          },
        },
      });
      this.L.info('Sent message');
    } catch (err) {
      this.L.warn(err);
      this.chatId = undefined; // The chatId may have expired, so invalidate it to force getting a new one on the retry attempt
      await this.sendMessage(fireDate, attempt + 1);
    }
  }

  private async getChatId(): Promise<string | null> {
    if (this.chatId) return this.chatId;

    const liveSearchResult = await this.youtube.search.list({
      part: ['snippet'],
      channelId: this.chatChannelId,
      eventType: 'live',
      type: ['video'],
    });
    const videoId = liveSearchResult.data?.items?.[0]?.id?.videoId;
    if (!videoId) return null;
    const videoDetails = await this.youtube.videos.list({
      id: [videoId],
      part: ['liveStreamingDetails'],
    });
    const chatId = videoDetails.data?.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
    if (!chatId) return null;
    this.chatId = chatId;
    return this.chatId;
  }
}

const chatterInstances: YouTubeChatter[] = [];

export function createChatter(props: YouTubeChatterProps): void {
  const { userId } = props.channelInfo;
  if (chatterInstances.some((chatter) => chatter.userId === userId)) {
    logger.warn({ userId }, 'User already has instance running. Skipping creation');
    return;
  }
  chatterInstances.push(new YouTubeChatter(props));
}

export async function getChannelInfo(credentials: Credentials): Promise<ChannelInfo> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials(credentials);
  const youtube = google.youtube({
    auth: oauth2Client,
    version: 'v3',
  });
  const profile = await youtube.channels.list({
    part: ['snippet'],
    mine: true,
  });
  const channel = profile.data?.items?.[0];
  if (!channel) throw new Error('Could not get user channel info');
  return {
    userId: channel.id as string,
    userTitle: channel.snippet?.title as string,
  };
}
