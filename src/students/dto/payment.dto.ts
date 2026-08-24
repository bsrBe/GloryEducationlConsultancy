import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsEnum(['telebirr', 'bank_transfer', 'cash'])
  method: string;

  @IsString()
  transactionRef: string;

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
