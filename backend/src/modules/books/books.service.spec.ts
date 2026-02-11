import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { BooksService, PaginatedBooksResult } from './books.service';
import { Book } from './book.entity';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { LoggerService } from '../../common/logger/logger.service';
import { CreateBookDto } from './dto/create-book.dto';

describe('BooksService', () => {
  let service: BooksService;
  let booksRepo: jest.Mocked<Repository<Book>>;
  let redis: jest.Mocked<RedisService>;
  let logger: jest.Mocked<LoggerService>;

  const mockBook: Book = {
    id: 'book-1',
    title: 'Test Book',
    author: 'Author',
    isbn: '978-0-00-000000-0',
    publicationYear: 2020,
    totalQuantity: 5,
    availableQuantity: 5,
    coverImagePath: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Book;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: getRepositoryToken(Book),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            invalidateBooksCache: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: { warn: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(BooksService);
    booksRepo = module.get(getRepositoryToken(Book));
    redis = module.get(RedisService);
    logger = module.get(LoggerService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates book with availableQuantity from totalQuantity and invalidates cache', async () => {
      const dto: CreateBookDto = {
        title: 'New Book',
        author: 'Writer',
        isbn: '978-0-11-111111-1',
        publicationYear: 2024,
        totalQuantity: 3,
      };
      const created = { ...mockBook, ...dto, availableQuantity: 3 };
      booksRepo.create.mockReturnValue(created as Book);
      booksRepo.save.mockResolvedValue(created as Book);

      const result = await service.create(dto);

      expect(booksRepo.create).toHaveBeenCalledWith({
        ...dto,
        availableQuantity: 3,
        coverImagePath: undefined,
      });
      expect(booksRepo.save).toHaveBeenCalledWith(created);
      expect(redis.invalidateBooksCache).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('throws BadRequestException when ISBN already exists', async () => {
      const dto: CreateBookDto = {
        title: 'New Book',
        author: 'Writer',
        isbn: mockBook.isbn,
        publicationYear: 2024,
        totalQuantity: 3,
      };
      booksRepo.findOne.mockResolvedValue(mockBook);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow('ISBN already exists');
      expect(booksRepo.create).not.toHaveBeenCalled();
      expect(booksRepo.save).not.toHaveBeenCalled();
      expect(redis.invalidateBooksCache).not.toHaveBeenCalled();
    });

    it('uses provided availableQuantity when present in dto', async () => {
      const dto: CreateBookDto = {
        title: 'New Book',
        author: 'Writer',
        isbn: '978-0-11-111111-1',
        publicationYear: 2024,
        totalQuantity: 10,
        availableQuantity: 2,
      };
      const created = { ...mockBook, ...dto, availableQuantity: 2 };
      booksRepo.create.mockReturnValue(created as Book);
      booksRepo.save.mockResolvedValue(created as Book);

      await service.create(dto);

      expect(booksRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ availableQuantity: 2 }),
      );
    });

    it('passes coverImagePath when provided', async () => {
      const dto: CreateBookDto = {
        title: 'New Book',
        author: 'Writer',
        isbn: '978-0-11-111111-1',
        publicationYear: 2024,
        totalQuantity: 1,
      };
      const created = { ...mockBook, coverImagePath: 'uploads/cover.jpg' };
      booksRepo.create.mockReturnValue(created as Book);
      booksRepo.save.mockResolvedValue(created as Book);

      await service.create(dto, 'uploads/cover.jpg');

      expect(booksRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ coverImagePath: 'uploads/cover.jpg' }),
      );
    });
  });

  describe('findAll', () => {
    it('returns from DB and caches when cache misses', async () => {
      redis.get.mockResolvedValue(null);
      booksRepo.findAndCount.mockResolvedValue([[mockBook], 1]);
      booksRepo.find.mockResolvedValue([
        { id: mockBook.id, availableQuantity: 5 },
      ] as Book[]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(redis.set).toHaveBeenCalled();
    });

    it('returns from cache and merges fresh availability when cache hits', async () => {
      const cached: PaginatedBooksResult = {
        data: [{ ...mockBook, availableQuantity: 0 }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      redis.get.mockResolvedValue(JSON.stringify(cached));
      booksRepo.find.mockResolvedValue([
        { id: mockBook.id, availableQuantity: 5 },
      ] as Book[]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data[0].availableQuantity).toBe(5);
    });

    it('falls back to DB and logs when cache value is invalid JSON', async () => {
      redis.get.mockResolvedValue('invalid-json');
      booksRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({});

      expect(logger.warn).toHaveBeenCalled();
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('returns empty result without calling merge when cached data has no items', async () => {
      const cached: PaginatedBooksResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      redis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(booksRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when book does not exist', async () => {
      booksRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('missing-id')).rejects.toThrow(
        'Book not found',
      );
    });

    it('returns book when found', async () => {
      booksRepo.findOne.mockResolvedValue(mockBook);

      const result = await service.findOne('book-1');

      expect(booksRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'book-1' },
      });
      expect(result).toEqual(mockBook);
    });
  });

  describe('update', () => {
    it('updates book and invalidates cache', async () => {
      booksRepo.findOne.mockResolvedValue(mockBook);
      const updated = { ...mockBook, title: 'Updated Title' };
      booksRepo.save.mockResolvedValue(updated as Book);

      const result = await service.update('book-1', { title: 'Updated Title' });

      expect(redis.invalidateBooksCache).toHaveBeenCalled();
      expect(result.title).toBe('Updated Title');
    });

    it('increases availableQuantity when totalQuantity is increased', async () => {
      const bookWithZero = {
        ...mockBook,
        totalQuantity: 5,
        availableQuantity: 0,
      };
      booksRepo.findOne.mockResolvedValue(bookWithZero as Book);
      booksRepo.save.mockImplementation((entity: Book) =>
        Promise.resolve(entity),
      );

      await service.update('book-1', { totalQuantity: 10 });

      const saved = booksRepo.save.mock.calls[0][0] as Book;
      expect(saved.totalQuantity).toBe(10);
      expect(saved.availableQuantity).toBe(5);
    });

    it('decreases availableQuantity when totalQuantity is decreased', async () => {
      const book = {
        ...mockBook,
        totalQuantity: 10,
        availableQuantity: 8,
      };
      booksRepo.findOne.mockResolvedValue(book as Book);
      booksRepo.save.mockImplementation((entity: Book) =>
        Promise.resolve(entity),
      );

      await service.update('book-1', { totalQuantity: 6 });

      const saved = booksRepo.save.mock.calls[0][0] as Book;
      expect(saved.totalQuantity).toBe(6);
      expect(saved.availableQuantity).toBe(4);
    });

    it('sets coverImagePath when provided', async () => {
      booksRepo.findOne.mockResolvedValue(mockBook);
      booksRepo.save.mockImplementation((entity: Book) =>
        Promise.resolve(entity),
      );

      await service.update('book-1', {}, 'uploads/new-cover.jpg');

      const saved = booksRepo.save.mock.calls[0][0] as Book;
      expect(saved.coverImagePath).toBe('uploads/new-cover.jpg');
    });

    it('throws BadRequestException when changing ISBN to one that already exists on another book', async () => {
      const current = { ...mockBook, id: 'book-1', isbn: '111' } as Book;
      const other = { ...mockBook, id: 'book-2', isbn: '222' } as Book;

      // First call: findOne(id) inside service.update
      // Second call: findOne({ where: { isbn } }) inside ensureIsbnUnique
      booksRepo.findOne
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(other);

      await expect(service.update('book-1', { isbn: '222' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
