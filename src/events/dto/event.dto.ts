import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  mainRoomLink?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  moderators?: string[];

  @IsOptional()
  @IsString()
  checkInCode?: string;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  mainRoomLink?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  moderators?: string[];

  @IsOptional()
  @IsString()
  checkInCode?: string;
}

export class CreateSessionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  @IsString()
  universityName?: string;

  @IsOptional()
  @IsString()
  representative?: string;

  @IsOptional()
  @IsString()
  repName?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  roomLink?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;
}

export class AssignStudentsDto {
  @IsArray()
  @IsString({ each: true })
  studentIds: string[];
}

export class CheckInDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  codeUsed?: string;

  @IsOptional()
  @IsBoolean()
  attended?: boolean;
}

export class JoinEventDto {
  @IsOptional()
  @IsNumber()
  sessionIndex?: number;
}

