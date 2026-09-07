import { Global, Module } from '@nestjs/common';
import { MongoService } from './mongodb.service';
import { AttemptMigrationService } from '../services/attempt-migration.service';

@Global()
@Module({
  providers: [MongoService, AttemptMigrationService],
  exports: [MongoService, AttemptMigrationService],
})
export class MongoModule {}

