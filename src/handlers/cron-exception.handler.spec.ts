// src/handlers/cron-exception.handler.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CronExceptionHandler } from './cron-exception.handler';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SlackService } from '../services/slack.service';
import { Logger } from '@nestjs/common';

// Mock CronJob 클래스
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
    // 원본 콜백 함수 생성
    originalCallback = jest.fn().mockImplementation(() => {
      throw new Error('Test cron error');
    });
    
    // 크론 작업 생성
    originalJob = new MockCronJob('* * * * *', originalCallback);
    
    // 크론 작업 맵 설정
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
    
    // 스파이 설정
    jest.spyOn(schedulerRegistry, 'getCronJobs');
    jest.spyOn(slackService, 'sendErrorNotification');
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('onApplicationBootstrap', () => {
    it('should wrap all cron jobs with error handling', async () => {
      // onApplicationBootstrap 실행 (onModuleInit 대신)
      handler.onApplicationBootstrap();

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 스케줄러 레지스트리에서 크론 작업 조회 확인
      expect(schedulerRegistry.getCronJobs).toHaveBeenCalled();
      
      // 원본 콜백이 래핑되었는지 확인 (callback이 변경되었는지)
      expect(originalJob.callback).not.toBe(originalCallback);
      
      // 래핑된 콜백 실행
      await originalJob.callback();
      
      // 원본 콜백이 호출되었는지 확인
      expect(originalCallback).toHaveBeenCalled();
      
      // 에러 알림이 SlackService로 전송되었는지 확인
      expect(slackService.sendErrorNotification).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          method: 'CRON',
          url: expect.stringContaining(testJobName),
        }),
      );
    });

    it('should handle errors if SchedulerRegistry throws', () => {
      // getCronJobs에서 에러 발생하도록 설정
      jest.spyOn(schedulerRegistry, 'getCronJobs').mockImplementation(() => {
        throw new Error('Registry error');
      });
      
      // 에러가 발생해도 onApplicationBootstrap은 완료되어야 함
      expect(() => handler.onApplicationBootstrap()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should correctly handle and format errors', async () => {
      // onApplicationBootstrap 실행 및 래핑된 콜백 실행
      handler.onApplicationBootstrap();

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 문자열 에러를 던지는 테스트
      originalCallback.mockImplementationOnce(() => {
        throw 'String error'; // 문자열 에러 (Error 객체가 아님)
      });
      
      await originalJob.callback();
      
      // 문자열 에러가 Error 객체로 변환되었는지 확인
      expect(slackService.sendErrorNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('String error'),
        }),
        expect.anything(),
      );
      
      // SlackService에서 에러가 발생하는 경우 테스트
      jest.spyOn(slackService, 'sendErrorNotification').mockRejectedValueOnce(
        new Error('Slack error')
      );
      
      // 크론 콜백 실행 시 SlackService 에러가 발생해도 작업은 계속 진행되어야 함
      await expect(originalJob.callback()).resolves.not.toThrow();
    });
  });
  
  // 타임아웃 테스트 추가 (setTimeout을 사용한 경우)
  describe('delayed initialization', () => {
    beforeEach(() => {
      // setTimeout 모킹
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should initialize after delay if setTimeout is used', () => {
      handler.onApplicationBootstrap();
      
      // 아직 getCronJobs가 호출되지 않았는지 확인
      expect(schedulerRegistry.getCronJobs).not.toHaveBeenCalled();
      
      // 타이머 진행
      jest.runAllTimers();
      
      // 이제 getCronJobs가 호출되었는지 확인
      expect(schedulerRegistry.getCronJobs).toHaveBeenCalled();
    });
  });
});