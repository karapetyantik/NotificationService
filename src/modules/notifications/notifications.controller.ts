import {
  Controller,
  Inject,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { DevicesService } from '../devices/devices.service';
import type { PushProvider } from '../push/push-provider.interface';
import { MessageSentEventDto } from './dto/message-sent-event.dto';
import { UrgentNotifyEventDto } from './dto/urgent-notify-event.dto';
import { RedisService } from '@common/redis/redis.service';

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

  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @EventPattern('urgent.notify')
  async handleUrgentNotify(@Payload() event: UrgentNotifyEventDto) {
    const tokens = await this.devicesService.getUserTokens(event.userId);
    const body = event.reason ?? 'Собеседник настаивает на срочном ответе';
    await this.sendToAllTokens(
      event.userId,
      tokens,
      '🔴 СРОЧНОЕ сообщение',
      body,
    );
  }

  private async notifyOfflineUser(userId: string, content?: string) {
    const tokens = await this.devicesService.getUserTokens(userId);
    await this.sendToAllTokens(
      userId,
      tokens,
      'Новое сообщение',
      content ?? 'Вложение',
    );
  }

  private async sendToAllTokens(
    userId: string,
    tokens: string[],
    title: string,
    body: string,
  ) {
    for (const token of tokens) {
      try {
        await this.pushProvider.send(token, title, body);
      } catch (error) {
        this.logger.error(
          `Не удалось отправить push userId=${userId} token=${token.slice(0, 10)}...: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
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
