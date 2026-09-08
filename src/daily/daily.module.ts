import { Module, Global } from '@nestjs/common';
import { DailyService } from './daily.service';

@Global()
@Module({
  providers: [DailyService],
  exports: [DailyService],
})
export class DailyModule {}
