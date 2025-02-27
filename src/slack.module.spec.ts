// src/slack.module.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SlackModule } from './slack.module';
import { SlackService } from './services/slack.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SlackModuleOptions } from './interfaces/slack-module-options.interface';

describe('SlackModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('forRoot', () => {
    it('should provide the slack service', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          SlackModule.forRoot({
            webhookUrl: 'https://hooks.slack.com/services/XXXX/YYYY/ZZZZ',
          }),
        ],
      }).compile();

      const service = module.get<SlackService>(SlackService);
      expect(service).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    it('should provide the slack service with useFactory', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          SlackModule.forRootAsync({
            useFactory: () => ({
              webhookUrl: 'https://hooks.slack.com/services/XXXX/YYYY/ZZZZ',
            }),
          }),
        ],
      }).compile();

      const service = module.get<SlackService>(SlackService);
      expect(service).toBeDefined();
    });

    it('should provide the slack service with useClass', async () => {
      class SlackConfigService {
        createSlackOptions(): SlackModuleOptions {
          return {
            webhookUrl: 'https://hooks.slack.com/services/XXXX/YYYY/ZZZZ',
          };
        }
      }

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          SlackModule.forRootAsync({
            useClass: SlackConfigService,
          }),
        ],
      }).compile();

      const service = module.get<SlackService>(SlackService);
      expect(service).toBeDefined();
    });

    it('should provide the slack service with useExisting', async () => {
      class SlackConfigService {
        createSlackOptions(): SlackModuleOptions {
          return {
            webhookUrl: 'https://hooks.slack.com/services/XXXX/YYYY/ZZZZ',
          };
        }
      }

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          SlackModule.forRootAsync({
            imports: [
              {
                module: class ConfigModule {},
                providers: [
                  {
                    provide: SlackConfigService,
                    useClass: SlackConfigService,
                  },
                ],
                exports: [SlackConfigService],
              },
            ],
            useExisting: SlackConfigService,
          }),
        ],
      }).compile();

      const service = module.get<SlackService>(SlackService);
      expect(service).toBeDefined();
    });

    it('should work with ConfigModule', async () => {
      // Mock process.env
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/XXXX/YYYY/ZZZZ';

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
          }),
          SlackModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
              webhookUrl: configService.get('SLACK_WEBHOOK_URL'),
            }),
          }),
        ],
      }).compile();

      const service = module.get<SlackService>(SlackService);
      expect(service).toBeDefined();

      // Clean up env
      delete process.env.SLACK_WEBHOOK_URL;
    });
  });
});