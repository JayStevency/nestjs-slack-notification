import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { SlackService } from '../services/slack.service';
import { SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class CronExceptionHandler implements OnModuleInit {
  private readonly logger = new Logger(CronExceptionHandler.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly slackService: SlackService,
  ) {}

  onModuleInit() {
    try {
      const jobs = this.schedulerRegistry.getCronJobs();
      
      jobs.forEach((job, name) => {
        const originalCallback = job.callback;
        
        job.callback = async () => {
          try {
            await originalCallback.call(job);
          } catch (error) {
            const formattedError = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Cron job "${name}" failed: ${formattedError.message}`, formattedError.stack);
            
            try {
              // Slack 알림 전송 시에도 오류가 발생할 수 있으므로 여기에도 try-catch 추가
              await this.slackService.sendErrorNotification(
                formattedError,
                { 
                  method: 'CRON', 
                  url: `cron-job:${name}`, 
                  ip: 'server'
                }
              );
            } catch (slackError) {
              this.logger.error(`Failed to send Slack notification: ${slackError.message}`, slackError instanceof Error ? slackError.stack : undefined);
            }
          }
        };
      });
      
      this.logger.log(`Cron exception handler initialized for ${jobs.size} jobs`);
    } catch (error) {
      this.logger.error('Failed to setup cron exception handling', error.stack);
    }
  }
}