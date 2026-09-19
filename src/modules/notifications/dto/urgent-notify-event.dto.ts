import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UrgentNotifyEventDto {
  @IsString()
  userId!: string;

  @IsString()
  chatId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  messagePreview?: string;
}
