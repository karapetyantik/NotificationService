import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { DevicesService } from '../devices/devices.service';
import { RedisService } from '@common/redis/redis.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let devicesService: { getUserTokens: jest.Mock };
  let pushProvider: { send: jest.Mock };
  let onlineCounts: Record<string, number>;

  beforeEach(async () => {
    onlineCounts = {};
    devicesService = { getUserTokens: jest.fn().mockResolvedValue([]) };
    pushProvider = { send: jest.fn().mockResolvedValue(undefined) };

    const calledKeys: string[] = [];
    const pipelineMock: { scard: jest.Mock; exec: jest.Mock } = {
      scard: jest.fn((key: string) => {
        calledKeys.push(key);
        return pipelineMock;
      }),
      exec: jest.fn(() =>
        Promise.resolve(calledKeys.map((k) => [null, onlineCounts[k] ?? 0])),
      ),
    };

    const redisService = {
      client: { pipeline: jest.fn().mockReturnValue(pipelineMock) },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: DevicesService, useValue: devicesService },
        { provide: RedisService, useValue: redisService },
        { provide: 'PUSH_PROVIDER', useValue: pushProvider },
      ],
    }).compile();

    controller = module.get(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('never notifies the sender', async () => {
    await controller.handleMessageSent({
      chatId: 'c1',
      senderId: 'sender1',
      content: 'hi',
      recipientIds: ['sender1'],
    });

    expect(devicesService.getUserTokens).not.toHaveBeenCalled();
  });

  it('skips recipients that have an active socket', async () => {
    onlineCounts['user_sockets:online-user'] = 1;

    await controller.handleMessageSent({
      chatId: 'c1',
      senderId: 'sender1',
      content: 'hi',
      recipientIds: ['online-user'],
    });

    expect(devicesService.getUserTokens).not.toHaveBeenCalled();
  });

  it('pushes to offline recipients devices', async () => {
    devicesService.getUserTokens.mockResolvedValue(['token1']);

    await controller.handleMessageSent({
      chatId: 'c1',
      senderId: 'sender1',
      content: 'hi',
      recipientIds: ['offline-user'],
    });

    expect(pushProvider.send).toHaveBeenCalledWith(
      'token1',
      'Новое сообщение',
      'hi',
    );
  });

  it('keeps processing remaining recipients if one push fails', async () => {
    devicesService.getUserTokens
      .mockResolvedValueOnce(['token-a'])
      .mockResolvedValueOnce(['token-b']);
    pushProvider.send
      .mockRejectedValueOnce(new Error('provider down'))
      .mockResolvedValueOnce(undefined);

    await controller.handleMessageSent({
      chatId: 'c1',
      senderId: 'sender1',
      content: 'hi',
      recipientIds: ['user-a', 'user-b'],
    });

    expect(pushProvider.send).toHaveBeenCalledTimes(2);
  });
});
