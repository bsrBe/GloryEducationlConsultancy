import {
  IsString,
  IsEnum,
  IsOptional,
  IsMongoId,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class SendMessageDto {
  // Staff only: the student to message. Students always write to the team.
  @IsOptional()
  @IsMongoId()
  recipientId?: string;

  @IsOptional()
  @IsEnum(['User', 'Student'])
  recipientModel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;

  @IsOptional()
  @IsEnum(['template', 'manual'])
  type?: string;

  @IsOptional()
  @IsString()
  templateName?: string;
}
