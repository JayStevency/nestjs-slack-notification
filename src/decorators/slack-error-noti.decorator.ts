/**
 * SlackErrorNoti decorator that wraps NestJS Cron decorator with error handling
 * and automatic Slack notifications.
 * 
 * @param cronTime - A cron pattern, a Date object
 * @returns Method decorator
 */
export function SlackErrorNoti(cronTime: string | Date) {
  return function(target: any, key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        this.logger.error(`Error in ${key}: ${error.message}`);
        
        if (this.slackService) {
          await this.slackService.sendErrorNotification(
            error,
            { 
              method: 'CRON', 
              url: key,
              ip: 'server'
            }
          );
        }
      }
    };
    
    return descriptor;
  };
}