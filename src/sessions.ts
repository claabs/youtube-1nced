import JSONdb from 'simple-json-db';

export interface UserSession {
  userId: string;
  userTitle: string;
  refreshToken: string;
}

const db = new JSONdb<UserSession>('config/sessions.json');
export default db;
