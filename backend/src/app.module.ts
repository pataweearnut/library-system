import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './modules/users/users.module';
import { BooksModule } from './modules/books/books.module';
import { BorrowingsModule } from './modules/borrowings/borrowings.module';
import { TypeOrmDatabaseModule } from './database/type-orm.database';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmDatabaseModule,
    UsersModule,
    BooksModule,
    BorrowingsModule,
  ],
})
export class AppModule {}
