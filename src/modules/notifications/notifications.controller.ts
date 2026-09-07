import {
  Controller,
  Inject,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { DevicesService } from '../devices/devices.service';
import { RedisService } from '@common/redis/redis.service';
import type { PushProvider } from '../push/push-provider.interface';
import { MessageSentEventDto } from './dto/message-sent-event.dto';

@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly devicesService: DevicesService,
    private readonly redisService: RedisService,
    @Inject('PUSH_PROVIDER') private readonly pushProvider: PushProvider,
  ) {}

  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @EventPattern('message.sent')
  async handleMessageSent(@Payload() event: MessageSentEventDto) {
    const candidates = event.recipientIds.filter(
      (userId) => userId !== event.senderId,
    );
    if (candidates.length === 0) return;

    const onlineFlags = await this.areOnline(candidates);

    for (const [index, userId] of candidates.entries()) {
      if (onlineFlags[index]) continue;

      try {
        await this.notifyOfflineUser(userId, event.content);
      } catch (error) {
        this.logger.error(
          `Не удалось отправить push userId=${userId}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  private async notifyOfflineUser(userId: string, content?: string) {
    const tokens = await this.devicesService.getUserTokens(userId);
    for (const token of tokens) {
      await this.pushProvider.send(
        token,
        'Новое сообщение',
        content ?? 'Вложение',
      );
    }
  }

  private async areOnline(userIds: string[]): Promise<boolean[]> {
    const pipeline = this.redisService.client.pipeline();
    for (const userId of userIds) {
      pipeline.scard(`user_sockets:${userId}`);
    }
    const results = await pipeline.exec();
    return (results ?? []).map(([, count]) => Number(count) > 0);
  }
}
