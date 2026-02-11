import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Borrowing } from './borrowing.entity';
import { Book } from '../books/book.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Borrowing, Book, User])],
  providers: [],
  controllers: [],
})
export class BorrowingsModule {}
