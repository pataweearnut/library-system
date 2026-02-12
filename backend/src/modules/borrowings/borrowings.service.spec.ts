import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, IsNull } from 'typeorm';
import { BorrowingsService } from './borrowings.service';
import { Borrowing } from './borrowing.entity';
import { Book } from '../books/book.entity';
import { User } from '../users/user.entity';
import { Role } from '../../common/enums/role.enum';

describe('BorrowingsService', () => {
  let service: BorrowingsService;
  let dataSource: DataSource;
  let borrowRepo: any;

  const mockBook: Book = {
    id: 'book-1',
    title: 'Book',
    availableQuantity: 3,
  } as Book;

  const mockUser: User = {
    id: 'user-1',
    email: 'u@example.com',
    role: Role.MEMBER,
  } as User;

  const mockBorrowing: Borrowing = {
    id: 'borrow-1',
    book: mockBook,
    user: mockUser,
    borrowedAt: new Date(),
    returnedAt: undefined,
  } as Borrowing;

  function createMockManager() {
    const getOne = jest.fn();
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne,
    };
    const manager = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(() => qb),
    };
    return { manager, getOne };
  }

  beforeEach(async () => {
    const { manager } = createMockManager();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BorrowingsService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((cb: (m: any) => Promise<any>) => cb(manager)),
          },
        },
        {
          provide: getRepositoryToken(Borrowing),
          useValue: {
            find: jest.fn(),
            findAndCount: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        { provide: getRepositoryToken(Book), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
      ],
    }).compile();

    service = module.get(BorrowingsService);
    dataSource = module.get(DataSource);
    borrowRepo = module.get(getRepositoryToken(Borrowing));
  });

  describe('borrow', () => {
    const createBookUpdateQb = (raw: any[] = []) => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw }),
    });

    it('throws NotFoundException when book not found', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const qb = createBookUpdateQb();
          const manager = {
            findOne: jest.fn().mockImplementation(async (entity: any) => {
              if (entity === User) {
                return mockUser;
              }
              if (entity === Book) {
                return null;
              }
              return null;
            }),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => qb),
          };

          return cb(manager as any);
        },
      );

      await expect(
        service.borrow('user-1', { bookId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.borrow('user-1', { bookId: 'missing' }),
      ).rejects.toThrow('Book not found');
    });

    it('throws BadRequestException when no copies available', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const qb = createBookUpdateQb();
          const manager = {
            findOne: jest.fn().mockImplementation(async (entity: any) => {
              if (entity === User) {
                return mockUser;
              }
              if (entity === Book) {
                return { ...mockBook, availableQuantity: 0 };
              }
              return null;
            }),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => qb),
          };

          return cb(manager as any);
        },
      );

      await expect(
        service.borrow('user-1', { bookId: mockBook.id }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.borrow('user-1', { bookId: mockBook.id }),
      ).rejects.toThrow('No copies available');
    });

    it('creates borrowing when atomic update succeeds', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const manager: any = {
            findOne: jest.fn().mockImplementation(async (entity: any) => {
              if (entity === User) {
                return mockUser;
              }
              return null;
            }),
            create: jest.fn().mockReturnValue(mockBorrowing),
            save: jest.fn().mockImplementation(async (entity: any) => entity),
          };

          const qb = createBookUpdateQb([
            { ...mockBook, availableQuantity: 2 },
          ]);

          manager.createQueryBuilder = jest.fn(() => qb);

          return cb(manager);
        },
      );

      const result = await service.borrow('user-1', { bookId: mockBook.id });
      expect(result).toEqual(mockBorrowing);
    });

    it('throws NotFoundException when user not found', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const manager = {
            findOne: jest.fn().mockResolvedValue(null),
            createQueryBuilder: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          };

          return cb(manager as any);
        },
      );

      await expect(
        service.borrow('missing-user', { bookId: mockBook.id }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.borrow('missing-user', { bookId: mockBook.id }),
      ).rejects.toThrow('User not found');
    });

    it('uses atomic update to decrement stock', async () => {
      const qb = createBookUpdateQb([{ ...mockBook, availableQuantity: 2 }]);

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const manager = {
            findOne: jest.fn().mockResolvedValue(mockUser),
            create: jest.fn().mockReturnValue(mockBorrowing),
            save: jest.fn().mockImplementation(async (e: any) => e),
            createQueryBuilder: jest.fn(() => qb),
          };

          return cb(manager as any);
        },
      );

      await service.borrow('user-1', { bookId: mockBook.id });

      expect(qb.update).toHaveBeenCalledWith(Book);
      expect(qb.andWhere).toHaveBeenCalledWith('"availableQuantity" > 0');
      expect(qb.execute).toHaveBeenCalled();

      // Also execute the SQL fragment function to satisfy function coverage.
      const setArg = qb.set.mock.calls[0][0];
      expect(typeof setArg.availableQuantity).toBe('function');
      expect(setArg.availableQuantity()).toBe('"availableQuantity" - 1');
    });

    it('handles two concurrent borrow requests correctly', async () => {
      const bookState = { ...mockBook, availableQuantity: 1 };
      let queue = Promise.resolve();

      (dataSource.transaction as jest.Mock).mockImplementation(
        (cb: (m: any) => Promise<any>) => {
          const run = async () => {
            const qb = {
              update: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              returning: jest.fn().mockReturnThis(),
              execute: jest.fn().mockImplementation(async () => {
                if (bookState.availableQuantity > 0) {
                  bookState.availableQuantity -= 1;
                  return {
                    raw: [{ ...bookState }],
                  };
                }
                return { raw: [] };
              }),
            };

            const manager = {
              findOne: jest.fn().mockImplementation(async (entity: any) => {
                if (entity === User) {
                  return mockUser;
                }
                if (entity === Book) {
                  return { ...bookState };
                }
                return null;
              }),
              create: jest.fn().mockReturnValue(mockBorrowing),
              save: jest.fn().mockImplementation(async (e: any) => e),
              createQueryBuilder: jest.fn(() => qb),
            };

            return cb(manager as any);
          };

          queue = queue.then(run);
          return queue;
        },
      );

      const [r1, r2] = await Promise.allSettled([
        service.borrow('user-1', { bookId: mockBook.id }),
        service.borrow('user-1', { bookId: mockBook.id }),
      ]);

      const fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled');
      const rejected = [r1, r2].filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
      expect(rejected[0].reason.message).toBe('No copies available');
      expect(bookState.availableQuantity).toBe(0);
    });
  });

  describe('return', () => {
    const createBorrowingUpdateQb = (raw: any[] = []) => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw }),
    });

    it('throws NotFoundException when borrowing not found', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const qb = createBorrowingUpdateQb();

          const manager = {
            createQueryBuilder: jest.fn(() => qb),
            findOne: jest.fn().mockResolvedValue(null),
          };

          return cb(manager as any);
        },
      );

      await expect(
        service.return('user-1', { borrowingId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when already returned', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const qb = createBorrowingUpdateQb();

          const manager = {
            createQueryBuilder: jest.fn(() => qb),
            findOne: jest.fn().mockResolvedValue({
              ...mockBorrowing,
              returnedAt: new Date(),
              user: mockUser,
            }),
          };

          return cb(manager as any);
        },
      );

      await expect(
        service.return('user-1', { borrowingId: mockBorrowing.id }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.return('user-1', { borrowingId: mockBorrowing.id }),
      ).rejects.toThrow('Already returned');
    });

    it('throws when returning someone elses borrowing', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const qb = createBorrowingUpdateQb();

          const manager = {
            createQueryBuilder: jest.fn(() => qb),
            findOne: jest.fn().mockResolvedValue({
              ...mockBorrowing,
              user: { id: 'other-user' } as User,
            }),
          };

          return cb(manager as any);
        },
      );

      await expect(
        service.return('user-1', { borrowingId: mockBorrowing.id }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.return('user-1', { borrowingId: mockBorrowing.id }),
      ).rejects.toThrow("Cannot return someone else's borrowing");
    });

    it('throws generic BadRequest when update fails for unknown reason', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const qb = createBorrowingUpdateQb();

          const manager = {
            createQueryBuilder: jest.fn(() => qb),
            // Simulate a borrowing that exists, is not returned, and belongs to the user
            findOne: jest.fn().mockResolvedValue({
              ...mockBorrowing,
              user: mockUser,
              returnedAt: undefined,
            }),
          };

          return cb(manager as any);
        },
      );

      await expect(
        service.return('user-1', { borrowingId: mockBorrowing.id }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.return('user-1', { borrowingId: mockBorrowing.id }),
      ).rejects.toThrow('Unable to return borrowing');
    });

    it('sets returnedAt and increments book when success', async () => {
      const borrowingWithUser = {
        ...mockBorrowing,
        user: mockUser,
        returnedAt: new Date(),
        book: { ...mockBook, availableQuantity: 1 },
      };

      const qbBorrowing = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          raw: [{ id: mockBorrowing.id, bookId: mockBook.id }],
        }),
      };

      const qbBook = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ raw: [] }),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const manager = {
            createQueryBuilder: jest
              .fn()
              .mockReturnValueOnce(qbBorrowing)
              .mockReturnValueOnce(qbBook),
            findOne: jest.fn().mockResolvedValue(borrowingWithUser),
          };

          return cb(manager as any);
        },
      );

      const result = await service.return('user-1', {
        borrowingId: mockBorrowing.id,
      });

      expect(result).toEqual(borrowingWithUser);
      expect(result.returnedAt).toBeDefined();

      // Execute SQL fragment functions to satisfy function coverage.
      const borrowingSetArg = qbBorrowing.set.mock.calls[0][0] as {
        returnedAt: () => string;
      };
      expect(typeof borrowingSetArg.returnedAt).toBe('function');
      borrowingSetArg.returnedAt();

      const bookSetArg = qbBook.set.mock.calls[0][0] as {
        availableQuantity: () => string;
      };
      expect(typeof bookSetArg.availableQuantity).toBe('function');
      bookSetArg.availableQuantity();
    });

    it('throws NotFoundException when borrowing not found after update', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const qbBorrowing = {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            returning: jest.fn().mockReturnThis(),
            // Simulate successful atomic UPDATE on Borrowing
            execute: jest.fn().mockResolvedValue({
              raw: [{ id: mockBorrowing.id, bookId: mockBook.id }],
            }),
          };

          const qbBook = {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            returning: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ raw: [] }),
          };

          const manager = {
            createQueryBuilder: jest
              .fn()
              .mockReturnValueOnce(qbBorrowing)
              .mockReturnValueOnce(qbBook),
            // Simulate the follow-up lookup failing
            findOne: jest.fn().mockResolvedValue(null),
          };

          return cb(manager as any);
        },
      );

      await expect(
        service.return('user-1', { borrowingId: mockBorrowing.id }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.return('user-1', { borrowingId: mockBorrowing.id }),
      ).rejects.toThrow('Borrowing not found after update');
    });

    it('handles two concurrent return requests correctly', async () => {
      const borrowingState = {
        ...mockBorrowing,
        user: mockUser,
        returnedAt: undefined as Date | undefined,
        book: { ...mockBook, availableQuantity: 0 },
      };

      let queue = Promise.resolve();

      (dataSource.transaction as jest.Mock).mockImplementation(
        (cb: (m: any) => Promise<any>) => {
          const run = async () => {
            const qbBorrowing = {
              update: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              returning: jest.fn().mockReturnThis(),
              execute: jest.fn().mockImplementation(async () => {
                if (!borrowingState.returnedAt) {
                  borrowingState.returnedAt = new Date();
                  return {
                    raw: [
                      {
                        id: borrowingState.id,
                        bookId: borrowingState.book.id,
                      },
                    ],
                  };
                }
                return { raw: [] };
              }),
            };

            const qbBook = {
              update: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              returning: jest.fn().mockReturnThis(),
              execute: jest.fn().mockImplementation(async () => {
                borrowingState.book.availableQuantity = Math.min(
                  borrowingState.book.availableQuantity + 1,
                  1,
                );
                return { raw: [] };
              }),
            };

            const manager = {
              createQueryBuilder: jest
                .fn()
                .mockReturnValueOnce(qbBorrowing)
                .mockReturnValueOnce(qbBook),
              findOne: jest.fn().mockResolvedValue({ ...borrowingState }),
            };

            return cb(manager as any);
          };

          queue = queue.then(run);
          return queue;
        },
      );

      const [r1, r2] = await Promise.allSettled([
        service.return('user-1', { borrowingId: mockBorrowing.id }),
        service.return('user-1', { borrowingId: mockBorrowing.id }),
      ]);

      const fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled');
      const rejected = [r1, r2].filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
      expect(rejected[0].reason.message).toBe('Already returned');
      expect(borrowingState.returnedAt).toBeDefined();
      expect(borrowingState.book.availableQuantity).toBe(1);
    });
  });

  describe('myActiveBorrowingsForBook', () => {
    it('returns active borrowings for user and book', async () => {
      borrowRepo.find.mockResolvedValue([mockBorrowing]);
      const result = await service.myActiveBorrowingsForBook(
        'user-1',
        'book-1',
      );
      expect(borrowRepo.find).toHaveBeenCalledWith({
        where: {
          user: { id: 'user-1' },
          book: { id: 'book-1' },
          returnedAt: IsNull(),
        },
        order: { borrowedAt: 'ASC' },
      });
      expect(result).toEqual([mockBorrowing]);
    });
  });

  describe('historyForBook', () => {
    it('returns paginated history', async () => {
      borrowRepo.findAndCount.mockResolvedValue([[mockBorrowing], 1]);
      const result = await service.historyForBook('book-1', 1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('uses default page and limit when omitted', async () => {
      borrowRepo.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.historyForBook('book-1');
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(0);
    });

    it('clamps limit to 100 and computes skip for page > 1', async () => {
      borrowRepo.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.historyForBook('book-1', 2, 150);
      expect(result.limit).toBe(100);
      expect(result.page).toBe(2);
      expect(borrowRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 100, take: 100 }),
      );
    });
  });

  describe('mostBorrowed', () => {
    it('returns raw many from query builder', async () => {
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ bookId: 'b1', title: 'T', borrowCount: '5' }]),
      };
      borrowRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.mostBorrowed(10);
      expect(result).toHaveLength(1);
      expect(result[0].bookId).toBe('b1');
    });

    it('uses default limit when omitted', async () => {
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      borrowRepo.createQueryBuilder.mockReturnValue(qb);
      await service.mostBorrowed();
      expect(qb.limit).toHaveBeenCalledWith(10);
    });
  });
});
