import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
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

  async unregisterDevice(token: string) {
    await this.prismaService.deviceToken.deleteMany({ where: { token } });
    return { success: true };
  }

  async getUserTokens(userId: string): Promise<string[]> {
    const tokens = await this.prismaService.deviceToken.findMany({
      where: { userId },
    });
    return tokens.map((t) => t.token);
  }
}
