import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { SlackService } from '@src/services';
import { SLACK_OPTIONS } from '@src/constants';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SlackService', () => {
  let service: SlackService;
  const mockOptions = {
    webhookUrl:
      'https://hooks.slack.com/services/XXX/YYY/ZZZ',
    channel: '#Test',
    username: 'TestBot',
    iconEmoji: ':robot_face:',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackService,
        {
          provide: SLACK_OPTIONS,
          useValue: mockOptions,
        },
      ],
    }).compile();

    service = module.get<SlackService>(SlackService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should successfully send a message to slack', async () => {
      
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: 'ok' });

      const message = 'Test message';
      const attachments = [{ color: 'good', text: 'This is a test' }];

      const result = await service.sendMessage(message, attachments);

      expect(mockedAxios.post).toHaveBeenCalledWith(mockOptions.webhookUrl, {
        text: message,
        attachments,
        channel: mockOptions.channel,
        username: mockOptions.username,
        icon_emoji: mockOptions.iconEmoji,
      });

      expect(result).toBe(true);
    });

    it('should return false when sending fails', async () => {
      
      mockedAxios.post.mockRejectedValueOnce(new Error('Failed to send'));

      const message = 'Test message';
      const result = await service.sendMessage(message);

      expect(mockedAxios.post).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
