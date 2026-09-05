import { Controller, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { DevicesService } from '../devices/devices.service';
import { RedisService } from 'src/common/redis/redis.service';
import type { PushProvider } from '../push/push-provider.interface';

interface MessageSentEvent {
  chatId: string;
  senderId: string;
  content?: string;
  recipientIds: string[];
}

@Controller()
export class NotificationsController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly redisService: RedisService,
    @Inject('PUSH_PROVIDER') private readonly pushProvider: PushProvider,
  ) {}

  @EventPattern('message.sent')
  async handleMessageSent(@Payload() event: MessageSentEvent) {
    for (const userId of event.recipientIds) {
      if (userId === event.senderId) continue;

      const activeSockets = await this.redisService.client.smembers(
        `user_sockets:${userId}`,
      );
      if (activeSockets.length > 0) continue;

      const tokens = await this.devicesService.getUserTokens(userId);
      for (const token of tokens) {
        await this.pushProvider.send(
          token,
          'Новое сообщение',
          event.content ?? 'Вложение',
        );
      }
    }
  }
}
