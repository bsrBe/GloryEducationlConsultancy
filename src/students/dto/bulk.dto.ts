import { IsString, IsArray, IsOptional, IsObject } from 'class-validator';

export class BulkEmailDto {
  @IsString()
  templateName: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentIds?: string[];

  @IsOptional()
  @IsString()
  filter?: string; // 'all', 'green', 'yellow', 'red', 'unpaid', 'incomplete_profile'
}

export class BulkAssessmentDto {
  @IsArray()
  assessments: Array<{
    studentId: string;
    categoryScores: Record<string, number>;
    totalScore: number;
  }>;
}
