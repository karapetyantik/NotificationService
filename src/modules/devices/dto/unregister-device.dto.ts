import { IsString } from 'class-validator';

export class UnregisterDeviceDto {
  @IsString()
  token!: string;
}
