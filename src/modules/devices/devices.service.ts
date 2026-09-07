import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prismaService: PrismaService) {}

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    return this.prismaService.deviceToken.upsert({
      where: { token: dto.token },
      update: { userId, platform: dto.platform },
      create: { userId, token: dto.token, platform: dto.platform },
    });
  }

  async unregisterDevice(userId: string, token: string) {
    const device = await this.prismaService.deviceToken.findUnique({
      where: { token },
    });

    if (!device) {
      throw new NotFoundException('Устройство не найдено');
    }
    if (device.userId !== userId) {
      throw new ForbiddenException('Это не ваше устройство');
    }

    await this.prismaService.deviceToken.delete({ where: { token } });
    return { success: true };
  }

  async getUserTokens(userId: string): Promise<string[]> {
    const tokens = await this.prismaService.deviceToken.findMany({
      where: { userId },
    });
    return tokens.map((t) => t.token);
  }
}
