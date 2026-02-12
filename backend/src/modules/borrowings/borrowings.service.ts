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

type UpdatedBorrowingRow = {
  id: string;
  bookId: string;
};

/**
 * Concurrent borrow/return is safe: operations run inside database transactions
 * and rely on single, conditional `UPDATE` statements (atomic updates) for both
 * the book stock (borrow) and the borrowing row (return). If two requests race
 * for the same resource, only one `UPDATE` succeeds and the other is translated
 * into a user-friendly error.
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
      // Ensure user exists
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      // Atomically decrement stock
      const updateResult = await manager
        .createQueryBuilder()
        .update(Book)
        .set({
          availableQuantity: () => '"availableQuantity" - 1',
        })
        .where('id = :bookId', { bookId: dto.bookId })
        .andWhere('"availableQuantity" > 0')
        .returning('*')
        .execute();

      // TypeORM's `raw` result is `any`; narrow it to `Book`.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const updatedBook = updateResult.raw[0] as unknown as Book;

      if (!updatedBook) {
        // Determine proper error
        const existing = await manager.findOne(Book, {
          where: { id: dto.bookId },
        });
        if (!existing) throw new NotFoundException('Book not found');
        throw new BadRequestException('No copies available');
      }

      // Create borrowing record
      const borrowing = manager.create(Borrowing, {
        book: updatedBook,
        user,
        borrowedAt: new Date(),
      });

      return manager.save(borrowing);
    });
  }

  async return(userId: string, dto: ReturnBookDto) {
    return this.dataSource.transaction(async (manager) => {
      // Atomically mark borrowing as returned
      const updateResult = await manager
        .createQueryBuilder()
        .update(Borrowing)
        .set({ returnedAt: () => 'NOW()' })
        .where('id = :id', { id: dto.borrowingId })
        .andWhere('"returnedAt" IS NULL')
        .andWhere('"userId" = :userId', { userId })
        .returning('*')
        .execute();

      const rawRows = updateResult.raw as unknown as UpdatedBorrowingRow[];
      const updatedBorrowingRow = rawRows[0];

      if (!updatedBorrowingRow) {
        const borrowing = await manager.findOne(Borrowing, {
          where: { id: dto.borrowingId },
          relations: ['user'],
        });

        if (!borrowing) {
          throw new NotFoundException('Borrowing not found');
        }
        if (borrowing.returnedAt) {
          throw new BadRequestException('Already returned');
        }
        if (borrowing.user.id !== userId) {
          throw new BadRequestException(
            "Cannot return someone else's borrowing",
          );
        }

        throw new BadRequestException('Unable to return borrowing');
      }

      // Atomically increment availability (never exceed totalQuantity)
      await manager
        .createQueryBuilder()
        .update(Book)
        .set({
          availableQuantity: () =>
            'LEAST("totalQuantity", "availableQuantity" + 1)',
        })
        .where('id = :bookId', { bookId: updatedBorrowingRow.bookId })
        .execute();

      // Return full borrowing entity
      const borrowingWithRelations = await manager.findOne(Borrowing, {
        where: { id: updatedBorrowingRow.id },
        relations: ['book', 'user'],
      });

      if (!borrowingWithRelations) {
        throw new NotFoundException('Borrowing not found after update');
      }

      return borrowingWithRelations;
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
