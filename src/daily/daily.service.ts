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
    try {
      const res = await axios.post(
        `${this.baseUrl}/rooms`,
        {
          name,
          privacy: opts?.privacy || 'private',
          max_participants: opts?.maxParticipants || 50,
          // Enable chat, screenshare for all
          enable_chat: true,
          enable_screenshare: true,
          enable_recording: false,
          // Auto-create if not exists (avoid 409 conflict)
          auto_create_room: true,
        },
        { headers: this.headers },
      );
      return res.data;
    } catch (err: any) {
      // 409 = room already exists — that's fine, return existing
      if (err.response?.status === 409) {
        return this.getRoom(name);
      }
      this.logger.error(`Failed to create Daily room "${name}": ${err.message}`);
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
   */
  async getMeetingToken(roomName: string, opts?: {
    userName?: string;
    isOwner?: boolean;
    expSeconds?: number;
    enableScreenshare?: boolean;
    closeTabOnExit?: boolean;
  }) {
    const payload: Record<string, any> = {
      room_name: roomName,
      // Token expires in 4 hours by default (enough for a fair session)
      exp: Math.floor(Date.now() / 1000) + (opts?.expSeconds || 4 * 60 * 60),
    };

    if (opts?.userName) payload.user_name = opts.userName;
    if (opts?.isOwner !== undefined) payload.is_owner = opts.isOwner;
    if (opts?.enableScreenshare !== undefined) payload.enable_screenshare = opts.enableScreenshare;
    if (opts?.closeTabOnExit !== undefined) payload.close_tab_on_exit = opts.closeTabOnExit;

    try {
      const res = await axios.post(
        `${this.baseUrl}/meeting-tokens`,
        payload,
        { headers: this.headers },
      );
      return res.data.token; // Daily returns { token: "..." }
    } catch (err: any) {
      this.logger.error(`Failed to generate meeting token for "${roomName}": ${err.message}`);
      throw err;
    }
  }

  /**
   * Build the full room URL for embedding.
   */
  getRoomUrl(roomName: string): string {
    return `https://${this.domain}/${roomName}`;
  }
}
