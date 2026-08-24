import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class MatchDto {
  @IsString()
  universityId: string;

  @IsString()
  program: string;

  @IsString()
  reason: string;
}

export class ApproveMatchDto {
  @IsEnum(['approved', 'rejected'])
  status: string;

  @IsOptional()
  @IsString()
  primaryUniversityId?: string;

  @IsOptional()
  @IsString()
  primaryProgram?: string;

  @IsOptional()
  @IsString()
  secondaryUniversityId?: string;

  @IsOptional()
  @IsString()
  secondaryProgram?: string;
}
