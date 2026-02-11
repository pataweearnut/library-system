import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Borrowing } from './borrowing.entity';
import { Book } from '../books/book.entity';
import { User } from '../users/user.entity';
import { BorrowingsService } from './borrowings.service';
import { BorrowingsController } from './borrowings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Borrowing, Book, User])],
  providers: [BorrowingsService],
  controllers: [BorrowingsController],
})
export class BorrowingsModule {}
