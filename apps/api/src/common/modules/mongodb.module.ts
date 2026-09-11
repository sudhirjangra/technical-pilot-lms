import { Global, Module } from '@nestjs/common';
import { AttemptMigrationService } from '../services/attempt-migration.service';
import { MongoService } from './mongodb.service';

@Global()
@Module({
  providers: [MongoService, AttemptMigrationService],
  exports: [MongoService, AttemptMigrationService],
})
export class MongoModule {}
