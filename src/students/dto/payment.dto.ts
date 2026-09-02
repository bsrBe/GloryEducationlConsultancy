import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsEnum(['telebirr', 'bank_transfer', 'bank', 'cash', 'cbe', 'boa'])
  method: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  transactionRef?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNumber()
  amount: number;
}

export class VerifyPaymentDto {
  @IsEnum(['Verified', 'Failed', 'Refunded', 'Credited'])
  status: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
