import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
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
  @IsNumber()
  reviewCapacity?: number;

  @IsOptional()
  @IsBoolean()
  liveSessionAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
