import { IsString, IsOptional } from 'class-validator';

export class PublishResultDto {
  @IsString()
  status: string;

  @IsString()
  nextStep: string;

  @IsOptional()
  @IsString()
  disclaimer?: string;
}
