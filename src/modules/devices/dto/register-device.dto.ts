import { IsIn, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  token!: string;

  @IsIn(['ios', 'android', 'web'])
  platform!: string;
}
