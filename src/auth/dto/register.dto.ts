import { IsEmail, IsString, IsEnum, IsOptional, MinLength } from 'class-validator';

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
  englishTest?: string;

  @IsOptional()
  englishScore?: number;

  @IsOptional()
  @IsString()
  influencerSource?: string;
}
