import { Inject, Injectable, Logger } from '@nestjs/common';
import { SLACK_OPTIONS } from '../constants';
import { SlackModuleOptions } from '../interfaces';
import axios from 'axios';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(
    @Inject(SLACK_OPTIONS)
    private readonly options: SlackModuleOptions,
  ) {}

  async sendMessage(
    message: string,
    attachments: any[] = [],
  ): Promise<boolean> {
    try {
      const payload = {
        text: message,
        attachments,
        channel: this.options.channel,
        username: this.options.username,
        icon_emoji: this.options.iconEmoji,
      };

      await axios.post(this.options.webhookUrl, payload);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send Slack notification: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async sendErrorNotification(error: Error, request?: any): Promise<boolean> {
    const timestamp = new Date().toISOString();
    const errorMessage = error.message || 'Unknown error';
    const errorStack = error.stack || 'No stack trace available';

    const serviceName = this.options.serviceName 
      ? `[${this.options.serviceName}] ` 
      : '';

    const attachments: any[] = [
      {
        color: 'danger',
        title: `[${serviceName}] Error ${errorMessage}`,
        fields: [
          {
            title: 'Timestamp',
            value: timestamp,
            short: true,
          },
          {
            title: 'Error Type',
            value: error.name || 'Error',
            short: true,
          },
        ],
        text: `\`\`\`${errorStack}\`\`\``,
      },
    ];

    if (request) {
      const requestInfo = {
        title: 'Request Info',
        fields: [
          {
            title: 'Method',
            value: request.method || 'N/A',
            short: true,
          },
          {
            title: 'URL',
            value: request.url || 'N/A',
            short: true,
          },
          {
            title: 'IP',
            value: request.ip || request.ips?.join(', ') || 'N/A',
            short: true,
          },
        ],
      };
      attachments.push(requestInfo);
    }
    const messageTitle = this.options.serviceName
    ? `[${this.options.serviceName}] Application Error Occurred`
    : 'Application Error Occurred';
  
  return this.sendMessage(messageTitle, attachments);
  }
}
