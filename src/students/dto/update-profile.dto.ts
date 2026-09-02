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
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsNumber()
  gpa?: number;

  @IsOptional()
  @IsNumber()
  graduationYear?: number;

  @IsOptional()
  @IsString()
  intendedProgram?: string;

  @IsOptional()
  @IsString()
  programInterest?: string;

  @IsOptional()
  @IsString()
  preferredCountry?: string;

  @IsOptional()
  @IsString()
  countryPreference?: string;

  @IsOptional()
  @IsString()
  preferredUniversity?: string;

  @IsOptional()
  @IsString()
  englishTest?: string;

  @IsOptional()
  @IsString()
  englishProficiency?: string;

  @IsOptional()
  @IsNumber()
  englishScore?: number;

  @IsOptional()
  @IsBoolean()
  passportAvailable?: boolean;

  @IsOptional()
  budget?: any;

  @IsOptional()
  financialBudget?: any;

  @IsOptional()
  @IsString()
  intake?: string;
}
