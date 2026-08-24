import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProgramDto } from './create-university.dto';

export class UpdateUniversityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  destination?: string;

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

  @IsOptional()
  isActive?: boolean;
}
