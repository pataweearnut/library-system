import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Borrowing } from './borrowing.entity';
import { BorrowBookDto } from './dto/borrow-book.dto';
import { ReturnBookDto } from './dto/return-book.dto';
import { Book } from '../books/book.entity';
import { User } from '../users/user.entity';

/**
 * Concurrent borrow/return is safe: operations run inside database transactions
 * with pessimistic write locks on the book (borrow) and on the borrowing row (return),
 * so multiple users borrowing the same book at the same time do not cause inconsistency.
 */
@Injectable()
export class BorrowingsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Borrowing)
    private readonly borrowRepo: Repository<Borrowing>,
  ) {}

  async borrow(userId: string, dto: BorrowBookDto) {
    return this.dataSource.transaction(async (manager) => {
      const book = await manager.findOne(Book, {
        where: { id: dto.bookId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!book) throw new NotFoundException('Book not found');
      if (book.availableQuantity <= 0) {
        throw new BadRequestException('No copies available');
      }

      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      book.availableQuantity -= 1;
      await manager.save(book);

      const borrowing = manager.create(Borrowing, {
        book,
        user,
        borrowedAt: new Date(),
      });
      return manager.save(borrowing);
    });
  }

  async return(userId: string, dto: ReturnBookDto) {
    return this.dataSource.transaction(async (manager) => {
      const borrowing = await manager
        .createQueryBuilder(Borrowing, 'borrowing')
        .innerJoinAndSelect('borrowing.book', 'book')
        .innerJoinAndSelect('borrowing.user', 'user')
        .where('borrowing.id = :id', { id: dto.borrowingId })
        .setLock('pessimistic_write')
        .getOne();

      if (!borrowing) throw new NotFoundException('Borrowing not found');
      if (borrowing.returnedAt) {
        throw new BadRequestException('Already returned');
      }
      if (borrowing.user.id !== userId) {
        throw new BadRequestException("Cannot return someone else's borrowing");
      }

      borrowing.returnedAt = new Date();
      await manager.save(borrowing);

      const book = borrowing.book;

      if (book.availableQuantity < book.totalQuantity) {
        book.availableQuantity += 1;
      }
      
      await manager.save(book);

      return borrowing;
    });
  }

  myActiveBorrowingsForBook(userId: string, bookId: string) {
    return this.borrowRepo.find({
      where: {
        user: { id: userId },
        book: { id: bookId },
        returnedAt: IsNull(),
      },
      order: { borrowedAt: 'ASC' },
    });
  }

  async historyForBook(bookId: string, page = 1, limit = 10) {
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;

    const [data, total] = await this.borrowRepo.findAndCount({
      where: { book: { id: bookId } },
      order: { borrowedAt: 'DESC' },
      skip,
      take,
    });

    return {
      data,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  mostBorrowed(limit = 10) {
    return this.borrowRepo
      .createQueryBuilder('borrowing')
      .leftJoin('borrowing.book', 'book')
      .select('book.id', 'bookId')
      .addSelect('book.title', 'title')
      .addSelect('COUNT(borrowing.id)', 'borrowCount')
      .groupBy('book.id')
      .addGroupBy('book.title')
      .orderBy('COUNT(borrowing.id)', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}
