import { Module, Global } from '@nestjs/common';
import { WherebyService } from './whereby.service';

@Global()
@Module({
  providers: [WherebyService],
  exports: [WherebyService],
})
export class WherebyModule {}
