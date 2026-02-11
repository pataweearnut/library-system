import { Test, TestingModule } from '@nestjs/testing';
import { BorrowingsController } from './borrowings.controller';
import { BorrowingsService } from './borrowings.service';
import { BorrowBookDto } from './dto/borrow-book.dto';
import { ReturnBookDto } from './dto/return-book.dto';

describe('BorrowingsController', () => {
  let controller: BorrowingsController;
  let borrowingsService: jest.Mocked<BorrowingsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BorrowingsController],
      providers: [
        {
          provide: BorrowingsService,
          useValue: {
            borrow: jest.fn(),
            return: jest.fn(),
            myActiveBorrowingsForBook: jest.fn(),
            historyForBook: jest.fn(),
            mostBorrowed: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(BorrowingsController);
    borrowingsService = module.get(BorrowingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('borrow', () => {
    it('calls service.borrow with userId from req and dto', async () => {
      const req = { user: { userId: 'user-1' } };
      const dto: BorrowBookDto = { bookId: 'book-1' };
      borrowingsService.borrow.mockResolvedValue({} as any);
      await controller.borrow(req as any, dto);
      expect(borrowingsService.borrow).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('return', () => {
    it('calls service.return with userId from req and dto', async () => {
      const req = { user: { userId: 'user-1' } };
      const dto: ReturnBookDto = { borrowingId: 'borrow-1' };
      borrowingsService.return.mockResolvedValue({} as any);
      await controller.return(req as any, dto);
      expect(borrowingsService.return).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('myActiveBorrowings', () => {
    it('calls service.myActiveBorrowingsForBook with userId and bookId', async () => {
      const req = { user: { userId: 'user-1' } };
      borrowingsService.myActiveBorrowingsForBook.mockResolvedValue([]);
      await controller.myActiveBorrowings(req as any, 'book-1');
      expect(borrowingsService.myActiveBorrowingsForBook).toHaveBeenCalledWith(
        'user-1',
        'book-1',
      );
    });
  });

  describe('history', () => {
    it('calls service.historyForBook with bookId and optional page/limit', async () => {
      borrowingsService.historyForBook.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
      await controller.history('book-1', '2', '20');
      expect(borrowingsService.historyForBook).toHaveBeenCalledWith(
        'book-1',
        2,
        20,
      );
    });

    it('calls service.historyForBook with defaults when page/limit omitted', async () => {
      borrowingsService.historyForBook.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
      await controller.history('book-1');
      expect(borrowingsService.historyForBook).toHaveBeenCalledWith(
        'book-1',
        undefined,
        undefined,
      );
    });
  });

  describe('mostBorrowed', () => {
    it('calls service.mostBorrowed with limit', async () => {
      borrowingsService.mostBorrowed.mockResolvedValue([]);
      await controller.mostBorrowed('5');
      expect(borrowingsService.mostBorrowed).toHaveBeenCalledWith(5);
    });
  });
});
