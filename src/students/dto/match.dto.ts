import {
  IsString,
  IsOptional,
  IsEnum,
  IsMongoId,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MatchDto {
  @IsString()
  universityId: string;

  @IsString()
  program: string;

  @IsString()
  reason: string;
}

export class ApproveMatchDto {
  @IsOptional()
  @IsEnum(['approved', 'rejected'])
  status?: string;

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

export class MatchChoiceDto {
  @IsMongoId()
  universityId: string;

  @IsOptional()
  @IsString()
  program?: string;
}

export class OverrideMatchDto {
  @ValidateNested()
  @Type(() => MatchChoiceDto)
  primary: MatchChoiceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MatchChoiceDto)
  secondary?: MatchChoiceDto;

  @IsString()
  @Matches(/\S/, { message: 'reason should not be empty' })
  reason: string;
}
