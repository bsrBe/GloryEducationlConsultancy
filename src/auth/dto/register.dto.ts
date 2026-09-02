import {
  IsEmail,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  MinLength,
} from 'class-validator';

export enum StudentRole {
  STUDENT = 'student',
}

export class RegisterStudentDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phone: string;

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
  influencerSource?: string;
}
