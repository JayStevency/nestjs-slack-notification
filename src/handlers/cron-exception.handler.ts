import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SlackService } from '../services/slack.service';
import { SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class CronExceptionHandler implements OnApplicationBootstrap {
  private readonly logger = new Logger(CronExceptionHandler.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly slackService: SlackService,
  ) {}

  onApplicationBootstrap() {
    setTimeout(() => {
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
    }, 1000);
  }
}