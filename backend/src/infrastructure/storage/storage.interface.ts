export interface StorageProvider {
    upload(
      file: Express.Multer.File,
    ): Promise<string | null>;
  }
  