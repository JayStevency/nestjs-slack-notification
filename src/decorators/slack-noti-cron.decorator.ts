import { Cron } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import { SlackService } from '../services/slack.service';

/**
 * SlackNotiCron decorator that wraps NestJS Cron decorator with error handling
 * and automatic Slack notifications.
 * 
 * @param cronTime - A cron pattern, a Date object
 * @param options - Optional cron job options
 * @returns Method decorator
 */
export function SlackNotiCron(cronTime: string | Date, options?: any) {
  return function(target: any, key: string, descriptor: PropertyDescriptor) {
    Cron(cronTime, options)(target, key, descriptor);
    
    const originalMethod = descriptor.value;
    const methodName = key;
    
    const logger = new Logger(`SlackNotiCron:${methodName}`);
    
    descriptor.value = async function(...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        logger.error(
          `Error in cron job "${methodName}": ${error.message}`, 
          error instanceof Error ? error.stack : undefined
        );
        
        try {
          const slackService = this.slackService as SlackService;
          
          if (slackService && typeof slackService.sendErrorNotification === 'function') {
            await slackService.sendErrorNotification(
              error instanceof Error ? error : new Error(String(error)),
              {
                method: 'CRON',
                url: `cron-job:${methodName}`,
                ip: 'server'
              }
            );
            logger.log(`Slack notification sent for error in "${methodName}"`);
          } else {
            logger.warn(
              `Could not send Slack notification: SlackService not available in the context. ` +
              `Make sure SlackService is injected in your class.`
            );
          }
        } catch (slackError) {
          logger.error(
            `Failed to send Slack notification: ${slackError.message}`,
            slackError instanceof Error ? slackError.stack : undefined
          );
        }
      }
    };
    
    return descriptor;
  };
}