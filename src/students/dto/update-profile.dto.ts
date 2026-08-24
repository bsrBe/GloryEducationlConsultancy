import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  age?: number;

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  gpa?: number;

  @IsOptional()
  graduationYear?: number;

  @IsOptional()
  @IsString()
  intendedProgram?: string;

  @IsOptional()
  @IsString()
  preferredCountry?: string;

  @IsOptional()
  @IsString()
  preferredUniversity?: string;

  @IsOptional()
  @IsString()
  englishTest?: string;

  @IsOptional()
  englishScore?: number;

  @IsOptional()
  passportAvailable?: boolean;

  @IsOptional()
  budget?: number;

  @IsOptional()
  @IsString()
  intake?: string;
}
