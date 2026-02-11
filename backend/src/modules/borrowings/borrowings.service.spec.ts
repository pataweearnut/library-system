import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, IsNull } from 'typeorm';
import { BorrowingsService } from './borrowings.service';
import { Borrowing } from './borrowing.entity';
import { Book } from '../books/book.entity';
import { User } from '../users/user.entity';
import { BorrowBookDto } from './dto/borrow-book.dto';
import { ReturnBookDto } from './dto/return-book.dto';
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
    const { manager, getOne } = createMockManager();
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
    it('throws NotFoundException when book not found', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const { manager } = createMockManager();
          manager.findOne.mockResolvedValue(null);
          return cb(manager);
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
          const { manager } = createMockManager();
          manager.findOne
            .mockResolvedValueOnce({ ...mockBook, availableQuantity: 0 })
            .mockResolvedValueOnce(mockUser);
          return cb(manager);
        },
      );
      await expect(
        service.borrow('user-1', { bookId: mockBook.id }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.borrow('user-1', { bookId: mockBook.id }),
      ).rejects.toThrow('No copies available');
    });

    it('creates borrowing and decrements book when success', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const { manager } = createMockManager();
          const book = { ...mockBook, availableQuantity: 2 };
          manager.findOne
            .mockResolvedValueOnce(book)
            .mockResolvedValueOnce(mockUser);
          manager.create.mockReturnValue(mockBorrowing);
          manager.save.mockImplementation((entity: any) => Promise.resolve(entity));
          return cb(manager);
        },
      );
      const result = await service.borrow('user-1', { bookId: mockBook.id });
      expect(result).toEqual(mockBorrowing);
    });

    it('throws NotFoundException when user not found', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const { manager } = createMockManager();
          manager.findOne
            .mockResolvedValueOnce(mockBook)
            .mockResolvedValueOnce(null);
          return cb(manager);
        },
      );
      await expect(
        service.borrow('missing-user', { bookId: mockBook.id }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.borrow('missing-user', { bookId: mockBook.id }),
      ).rejects.toThrow('User not found');
    });
  });

  describe('return', () => {
    it('throws NotFoundException when borrowing not found', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const { manager, getOne } = createMockManager();
          getOne.mockResolvedValue(null);
          return cb(manager);
        },
      );
      await expect(
        service.return('user-1', { borrowingId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when already returned', async () => {
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const { manager, getOne } = createMockManager();
          getOne.mockResolvedValue({
            ...mockBorrowing,
            returnedAt: new Date(),
            user: mockUser,
          });
          return cb(manager);
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
          const { manager, getOne } = createMockManager();
          getOne.mockResolvedValue({
            ...mockBorrowing,
            user: { id: 'other-user' },
          });
          return cb(manager);
        },
      );
      await expect(
        service.return('user-1', { borrowingId: mockBorrowing.id }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.return('user-1', { borrowingId: mockBorrowing.id }),
      ).rejects.toThrow("Cannot return someone else's borrowing");
    });

    it('sets returnedAt and increments book when success', async () => {
      const borrowingWithUser = {
        ...mockBorrowing,
        user: mockUser,
        returnedAt: undefined,
        book: { ...mockBook, availableQuantity: 0 },
      };
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: any) => Promise<any>) => {
          const { manager, getOne } = createMockManager();
          getOne.mockResolvedValue(borrowingWithUser);
          manager.save.mockImplementation((entity: any) => Promise.resolve(entity));
          return cb(manager);
        },
      );
      const result = await service.return('user-1', {
        borrowingId: mockBorrowing.id,
      });
      expect(result).toBeDefined();
      expect(result.returnedAt).toBeDefined();
    });
  });

  describe('myActiveBorrowingsForBook', () => {
    it('returns active borrowings for user and book', async () => {
      borrowRepo.find.mockResolvedValue([mockBorrowing]);
      const result = await service.myActiveBorrowingsForBook('user-1', 'book-1');
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
          .mockResolvedValue([
            { bookId: 'b1', title: 'T', borrowCount: '5' },
          ]),
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
