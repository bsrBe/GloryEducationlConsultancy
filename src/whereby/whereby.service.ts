import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface CreateMeetingOptions {
  /** ISO date-time when the meeting should end. Room is auto-deleted 1 hour after this. */
  endDate: Date | string;
  /** Request hostRoomUrl so staff get moderator privileges. */
  withHost?: boolean;
}

export interface WherebyMeeting {
  meetingId: string;
  startDate: string;
  endDate: string;
  roomUrl: string;
  hostRoomUrl?: string;
  viewerRoomUrl?: string;
}

@Injectable()
export class WherebyService {
  private readonly logger = new Logger(WherebyService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.whereby.dev/v1';

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('WHEREBY_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn(
        'WHEREBY_API_KEY is not set — video room creation will fail until it is configured.',
      );
    } else {
      // Never log the key itself — only its shape so misconfigurations are visible.
      this.logger.log(
        `Whereby API key loaded (prefix: "${this.apiKey.substring(0, 4)}...", length: ${this.apiKey.length})`,
      );
    }
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a transient Whereby meeting.
   * The room is available between creation and 1 hour after endDate, then auto-deleted.
   * Whereby has no meeting tokens and no plan-gated room properties —
   * host privileges are granted via the hostRoomUrl returned here.
   */
  async createMeeting(opts: CreateMeetingOptions): Promise<WherebyMeeting> {
    const body: Record<string, unknown> = {
      // Whereby requires an ISO-8601 end date; rooms auto-delete 1 hour later.
      endDate: new Date(opts.endDate).toISOString(),
    };
    if (opts.withHost !== false) {
      body.fields = ['hostRoomUrl'];
    }

    try {
      this.logger.debug(
        `Creating Whereby meeting with endDate=${body.endDate}`,
      );
      const res = await axios.post(`${this.baseUrl}/meetings`, body, {
        headers: this.headers,
      });
      this.logger.log(
        `Whereby meeting created: meetingId=${res.data?.meetingId} roomUrl=${res.data?.roomUrl}`,
      );
      return res.data as WherebyMeeting;
    } catch (err: any) {
      const detail = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      const status = err.response?.status ?? 'unknown';
      this.logger.error(
        `Failed to create Whereby meeting (HTTP ${status}): ${detail}`,
      );

      // Surface actionable messages to the client instead of a generic 500.
      if (status === 401) {
        throw new InternalServerErrorException(
          'Video provider rejected the server API key. Verify WHEREBY_API_KEY in the backend environment.',
        );
      }
      if (status === 429) {
        throw new InternalServerErrorException(
          'Video provider rate limit reached. Please try again in a moment.',
        );
      }
      if (status === 400) {
        throw new BadRequestException(
          `Video provider rejected the meeting request: ${detail}`,
        );
      }
      throw err;
    }
  }

  /**
   * Fetch a single meeting by id (useful for debugging / verifying a room exists).
   */
  async getMeeting(meetingId: string) {
    try {
      const res = await axios.get(
        `${this.baseUrl}/meetings/${meetingId}`,
        { headers: this.headers },
      );
      return res.data;
    } catch (err: any) {
      const detail = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      const status = err.response?.status ?? 'unknown';
      this.logger.error(
        `Failed to fetch Whereby meeting "${meetingId}" (HTTP ${status}): ${detail}`,
      );
      throw err;
    }
  }
}
