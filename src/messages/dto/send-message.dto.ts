import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export class SendMessageDto {
  @IsString()
  recipientId: string;

  @IsEnum(['User', 'Student'])
  recipientModel: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsEnum(['template', 'manual'])
  type?: string;

  @IsOptional()
  @IsString()
  templateName?: string;
}
