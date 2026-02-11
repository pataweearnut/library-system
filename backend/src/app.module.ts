import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BooksModule } from './modules/books/books.module';
import { BorrowingsModule } from './modules/borrowings/borrowings.module';
import { TypeOrmDatabaseModule } from './database/type-orm.database';
import { LoggerModule } from './common/logger/logger.module';
import { RedisModule } from './infrastructure/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    RedisModule,
    TypeOrmDatabaseModule,
    AuthModule,
    UsersModule,
    BooksModule,
    BorrowingsModule,
  ],
})
export class AppModule {}
