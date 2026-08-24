import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProgramDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  degreeLevel?: string;

  @IsOptional()
  gpaRequirement?: number;

  @IsOptional()
  @IsString()
  englishRequirement?: string;

  @IsOptional()
  @IsString()
  tuitionInfo?: string;
}

export class CreateUniversityDto {
  @IsString()
  name: string;

  @IsString()
  destination: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProgramDto)
  programs?: CreateProgramDto[];

  @IsOptional()
  @IsString()
  representative?: string;

  @IsOptional()
  reviewCapacity?: number;

  @IsOptional()
  liveSessionAvailable?: boolean;
}
