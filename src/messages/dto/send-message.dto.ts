import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export class SendMessageDto {
  @IsString()
  recipientId: string;

  @IsEnum(['User', 'Student'])
  recipientModel: string;

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(['template', 'manual'])
  type?: string;

  @IsOptional()
  @IsString()
  templateName?: string;
}
