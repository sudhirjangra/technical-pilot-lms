import { SaveFileOptions } from '@/common/interfaces';
import { Env } from '@/common/utils';
import { deleteFile, deleteFiles, saveFile } from '@/common/utils/file';
import { MemoryStorageFile } from '@blazity/nest-file-fastify';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

@Injectable()
export class FileService {
  constructor(
    private readonly configService: ConfigService<Env>,
    private readonly loggerService: Logger,
  ) {}

  async uploadFile(
    storageFile: MemoryStorageFile,
    options?: SaveFileOptions,
  ): Promise<{ filename: string; filepath: string }> {
    return await saveFile(storageFile, options);
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await deleteFile(path);
    } catch (e) {
      this.loggerService.error(e);
      throw new BadRequestException(e);
    }
  }

  async deleteFiles(filePaths: string[]): Promise<void> {
    try {
      await deleteFiles(filePaths);
    } catch (e) {
      this.loggerService.error(e);
      throw new BadRequestException(e);
    }
  }
}
