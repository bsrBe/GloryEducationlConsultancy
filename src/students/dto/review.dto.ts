import { IsEnum, IsString, IsOptional } from 'class-validator';

export class CreateReviewDto {
  @IsEnum(['Green', 'Yellow', 'Red'])
  decision: string;

  @IsOptional()
  @IsString()
  comments?: string;
}
