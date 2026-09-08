import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class DailyService {
  private readonly logger = new Logger(DailyService.name);
  private readonly apiKey: string;
  private readonly domain: string;
  private readonly baseUrl = 'https://api.daily.co/v1';

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('DAILY_API_KEY') || '';
    this.domain = this.config.get<string>('DAILY_DOMAIN') || '';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create or ensure a room exists.
   * If the room already exists, Daily returns it (idempotent by name).
   */
  async createRoom(name: string, opts?: { privacy?: string; maxParticipants?: number }) {
    const properties: Record<string, any> = {
      enable_chat: true,
      enable_screenshare: true,
      enable_hand_raising: true,
      enable_emoji_reactions: true,
    };

    // max_participants is plan-gated on Daily.co (free plan rejects high values).
    // Only set it when explicitly configured via env (DAILY_MAX_PARTICIPANTS) or opts.
    const maxParticipants =
      opts?.maxParticipants ?? this.config.get<number>('DAILY_MAX_PARTICIPANTS');
    if (maxParticipants) {
      properties.max_participants = maxParticipants;
    }

    try {
      const res = await axios.post(
        `${this.baseUrl}/rooms`,
        {
          name,
          privacy: opts?.privacy || 'private',
          properties,
        },
        { headers: this.headers },
      );
      return res.data;
    } catch (err: any) {
      // 409 = room already exists — that's fine, return existing
      if (err.response?.status === 409) {
        return this.getRoom(name);
      }

      // 400 = likely a plan-restricted property → retry with minimal config
      if (err.response?.status === 400) {
        try {
          const res = await axios.post(
            `${this.baseUrl}/rooms`,
            { name, privacy: opts?.privacy || 'private' },
            { headers: this.headers },
          );
          this.logger.warn(
            `Created Daily room "${name}" with minimal properties (plan restrictions on room config)`,
          );
          return res.data;
        } catch (retryErr: any) {
          if (retryErr.response?.status === 409) {
            return this.getRoom(name);
          }
          const retryDetail = retryErr.response?.data
            ? JSON.stringify(retryErr.response.data)
            : retryErr.message;
          this.logger.error(`Failed to create Daily room "${name}": ${retryDetail}`);
          throw retryErr;
        }
      }

      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      this.logger.error(`Failed to create Daily room "${name}": ${detail}`);
      throw err;
    }
  }

  /**
   * Get room details by name.
   */
  async getRoom(name: string) {
    const res = await axios.get(`${this.baseUrl}/rooms/${name}`, {
      headers: this.headers,
    });
    return res.data;
  }

  /**
   * Generate a meeting token for a specific room.
   * Tokens are short-lived JWTs signed by Daily.co.
   * Daily.co REST API expects: { properties: { room_name, exp, ... } }
   */
  async getMeetingToken(
    roomName: string,
    opts?: {
      userName?: string;
      isOwner?: boolean;
      expSeconds?: number;
      enableScreenshare?: boolean;
      closeTabOnExit?: boolean;
    },
  ) {
    const tokenProperties: Record<string, any> = {
      room_name: roomName,
      // Token expires in 4 hours by default (enough for a fair session)
      exp: Math.floor(Date.now() / 1000) + (opts?.expSeconds || 4 * 60 * 60),
    };

    if (opts?.userName) tokenProperties.user_name = opts.userName;
    if (opts?.isOwner !== undefined) tokenProperties.is_owner = opts.isOwner;
    if (opts?.enableScreenshare !== undefined) tokenProperties.enable_screenshare = opts.enableScreenshare;
    if (opts?.closeTabOnExit !== undefined) tokenProperties.close_tab_on_exit = opts.closeTabOnExit;

    try {
      this.logger.debug(
        `Requesting Daily meeting token for room "${roomName}" with properties: ${JSON.stringify(tokenProperties)}`,
      );

      // Daily.co API strictly expects { properties: { ... } }
      const res = await axios.post(
        `${this.baseUrl}/meeting-tokens`,
        { properties: tokenProperties },
        { headers: this.headers },
      );
      return res.data.token; // Daily returns { token: "..." }
    } catch (err: any) {
      const detail = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(
        `Failed to generate meeting token for "${roomName}". Daily API response: ${detail}`,
      );

      // If Daily rejected with 400, retry with minimal properties in case optional settings are plan-restricted
      if (err.response?.status === 400) {
        try {
          this.logger.warn(
            `Retrying meeting token for "${roomName}" with minimal properties...`,
          );
          const minimalProps: Record<string, any> = {
            room_name: roomName,
            is_owner: opts?.isOwner ?? false,
            exp: Math.floor(Date.now() / 1000) + (opts?.expSeconds || 4 * 60 * 60),
          };
          if (opts?.userName) minimalProps.user_name = opts.userName;

          const retryRes = await axios.post(
            `${this.baseUrl}/meeting-tokens`,
            { properties: minimalProps },
            { headers: this.headers },
          );
          this.logger.log(
            `Successfully generated meeting token with minimal properties for "${roomName}"`,
          );
          return retryRes.data.token;
        } catch (retryErr: any) {
          const retryDetail = retryErr.response?.data
            ? JSON.stringify(retryErr.response.data)
            : retryErr.message;
          this.logger.error(
            `Retry meeting token generation for "${roomName}" also failed: ${retryDetail}`,
          );
          throw retryErr;
        }
      }

      throw err;
    }
  }

  /**
   * Build the full room URL for embedding.
   */
  getRoomUrl(roomName: string): string {
    const cleanDomain = (this.domain || '')
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');
    return `https://${cleanDomain}/${roomName}`;
  }
}
