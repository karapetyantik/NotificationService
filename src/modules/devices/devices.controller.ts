import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/auth/jwt-auth.guard';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register-device')
  registerDevice(@Req() req: any, @Body() dto: RegisterDeviceDto) {
    return this.devicesService.registerDevice(req.user.userId, dto);
  }

  @Post('unregister-device')
  unregisterDevice(@Body('token') token: string) {
    return this.devicesService.unregisterDevice(token);
  }
}
