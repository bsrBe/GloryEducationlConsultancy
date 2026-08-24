import { IsString, IsOptional } from 'class-validator';

export class ReviewDocumentDto {
  @IsString()
  status: string;
}
