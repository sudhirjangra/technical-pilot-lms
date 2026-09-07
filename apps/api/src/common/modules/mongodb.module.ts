import { Global, Module } from '@nestjs/common';
import { MongoService } from './mongodb.service';

@Global()
@Module({
  providers: [MongoService],
  exports: [MongoService],
})
export class MongoModule {}
