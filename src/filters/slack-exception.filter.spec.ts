import { Test, TestingModule } from '@nestjs/testing';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpException, HttpStatus, INestApplication } from '@nestjs/common';
import { SlackExceptionFilter } from './slalck-exception.filter';
import { SlackService } from '@src/services';

describe('SlackExceptionFilter', () => {
  let filter: SlackExceptionFilter;
  let slackService: SlackService;
  let httpAdapter: any;

  beforeEach(async () => {
    // Create mocks
    httpAdapter = {
      getRequestUrl: jest.fn().mockReturnValue('/test'),
      reply: jest.fn(),
    };

    const httpAdapterHost = {
      httpAdapter,
    };

    slackService = {
      sendErrorNotification: jest.fn().mockResolvedValue(true),
      sendMessage: jest.fn().mockResolvedValue(true),
    } as any;

    filter = new SlackExceptionFilter(
      httpAdapterHost as HttpAdapterHost,
      slackService,
    );
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should handle HttpException', async () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const host = {
        switchToHttp: () => ({
          getRequest: () => ({ url: '/test', method: 'GET' }),
          getResponse: () => ({}),
        }),
      } as any;

      await filter.catch(exception, host);

      // Should not send notification for 4xx errors
      expect(slackService.sendErrorNotification).not.toHaveBeenCalled();

      // Should reply with proper status code
      expect(httpAdapter.reply).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          path: '/test',
        }),
        HttpStatus.BAD_REQUEST,
      );
    });

    it('should handle server errors and send notifications', async () => {
      const exception = new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      const host = {
        switchToHttp: () => ({
          getRequest: () => ({ url: '/test', method: 'GET' }),
          getResponse: () => ({}),
        }),
      } as any;

      await filter.catch(exception, host);

      // Should send notification for 5xx errors
      expect(slackService.sendErrorNotification).toHaveBeenCalledWith(
        exception,
        expect.anything(),
      );

      // Should reply with proper status code
      expect(httpAdapter.reply).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          path: '/test',
        }),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });

    it('should handle unknown errors', async () => {
      const exception = new Error('Unknown error');
      const host = {
        switchToHttp: () => ({
          getRequest: () => ({ url: '/test', method: 'GET' }),
          getResponse: () => ({}),
        }),
      } as any;

      await filter.catch(exception, host);

      // Should send notification for unknown errors
      expect(slackService.sendErrorNotification).toHaveBeenCalledWith(
        exception,
        expect.anything(),
      );

      // Should reply with 500 status code
      expect(httpAdapter.reply).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          path: '/test',
        }),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });
  });
});
