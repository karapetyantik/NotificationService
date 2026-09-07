import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '@common/auth/authenticated-request.interface';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UnregisterDeviceDto } from './dto/unregister-device.dto';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register-device')
  registerDevice(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.devicesService.registerDevice(req.user.userId, dto);
  }

  @Post('unregister-device')
  unregisterDevice(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UnregisterDeviceDto,
  ) {
    return this.devicesService.unregisterDevice(req.user.userId, dto.token);
  }
}
