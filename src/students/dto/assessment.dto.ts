import { IsObject, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AssessmentOverrideDto {
  @IsNumber()
  score: number;

  @IsString()
  reason: string;
}

export class CreateAssessmentDto {
  @IsObject()
  categoryScores: Record<string, number>;

  @IsNumber()
  totalScore: number;
}

export class OverrideAssessmentDto {
  @IsNumber()
  score: number;

  @IsString()
  reason: string;
}
