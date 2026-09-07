import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { DevicesModule } from '../devices/devices.module';
import { RedisModule } from '@common/redis/redis.module';
import { ConsolePushProvider } from '../push/console-push.provider';

@Module({
  imports: [DevicesModule, RedisModule],
  controllers: [NotificationsController],
  providers: [
    {
      provide: 'PUSH_PROVIDER',
      useClass: ConsolePushProvider,
    },
  ],
})
export class NotificationsModule {}
