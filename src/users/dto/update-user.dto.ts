import { IsEmail, IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  isActive?: boolean;
}
