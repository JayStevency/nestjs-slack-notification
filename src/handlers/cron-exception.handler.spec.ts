import { Test, TestingModule } from '@nestjs/testing';
import { CronExceptionHandler } from './cron-exception.handler';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SlackService } from '../services/slack.service';
import { Logger } from '@nestjs/common';

class MockCronJob {
  constructor(public cronTime: string, public callback: Function) {}
  call() {
    return this.callback();
  }
}

describe('CronExceptionHandler', () => {
  let handler: CronExceptionHandler;
  let schedulerRegistry: SchedulerRegistry;
  let slackService: SlackService;
  
  const mockCronJobs = new Map<string, MockCronJob>();
  const testJobName = 'testCronJob';
  let originalJob: MockCronJob;
  let originalCallback: jest.Mock;
  
  beforeEach(async () => {
    
    originalCallback = jest.fn().mockImplementation(() => {
      throw new Error('Test cron error');
    });
    
    originalJob = new MockCronJob('* * * * *', originalCallback);
    
    mockCronJobs.set(testJobName, originalJob);
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronExceptionHandler,
        {
          provide: SchedulerRegistry,
          useValue: {
            getCronJobs: jest.fn().mockReturnValue(mockCronJobs),
          },
        },
        {
          provide: SlackService,
          useValue: {
            sendErrorNotification: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<CronExceptionHandler>(CronExceptionHandler);
    schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry);
    slackService = module.get<SlackService>(SlackService);
    
    jest.spyOn(schedulerRegistry, 'getCronJobs');
    jest.spyOn(slackService, 'sendErrorNotification');
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should wrap all cron jobs with error handling', async () => {
      
      handler.onModuleInit();
      
      expect(schedulerRegistry.getCronJobs).toHaveBeenCalled();
      
      expect(originalJob.callback).not.toBe(originalCallback);
      
      await originalJob.callback();
      
      expect(originalCallback).toHaveBeenCalled();
      
      expect(slackService.sendErrorNotification).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          method: 'CRON',
          url: expect.stringContaining(testJobName),
        }),
      );
    });

    it('should handle errors if SchedulerRegistry throws', () => {
      
      jest.spyOn(schedulerRegistry, 'getCronJobs').mockImplementation(() => {
        throw new Error('Registry error');
      });
      
      expect(() => handler.onModuleInit()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should correctly handle and format errors', async () => {
      
      handler.onModuleInit();
      
      originalCallback.mockImplementationOnce(() => {
        throw 'String error';
      });
      
      await originalJob.callback();
      
      expect(slackService.sendErrorNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('String error'),
        }),
        expect.anything(),
      );
      
      jest.spyOn(slackService, 'sendErrorNotification').mockRejectedValueOnce(
        new Error('Slack error')
      );
      
      await expect(originalJob.callback()).resolves.not.toThrow();
    });
  });
});