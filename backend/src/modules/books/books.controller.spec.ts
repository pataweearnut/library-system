import { Test, TestingModule } from '@nestjs/testing';
import { BooksController, COVER_URL_OR_PATH_KEY } from './books.controller';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book } from './book.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SingleFileUploadInterceptor } from '../../common/interceptors/single-file-upload.interceptor';

describe('BooksController', () => {
  let controller: BooksController;
  let booksService: jest.Mocked<BooksService>;

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
      controllers: [BooksController],
      providers: [
        {
          provide: BooksService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(SingleFileUploadInterceptor)
      .useValue({ intercept: (_ctx: any, next: any) => next.handle() })
      .compile();

    controller = module.get(BooksController);
    booksService = module.get(BooksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('calls service.create with dto and cover from request when present', async () => {
      const dto: CreateBookDto = {
        title: 'New Book',
        author: 'Writer',
        isbn: '978-0-11-111111-1',
        publicationYear: 2024,
        totalQuantity: 3,
      };
      const req = { [COVER_URL_OR_PATH_KEY]: 'uploads/cover-123.jpg' };
      booksService.create.mockResolvedValue(mockBook);

      const result = await controller.create(dto, req as any);

      expect(booksService.create).toHaveBeenCalledWith(
        dto,
        'uploads/cover-123.jpg',
      );
      expect(result).toEqual(mockBook);
    });

    it('calls service.create with undefined cover when request has no cover', async () => {
      const dto: CreateBookDto = {
        title: 'New Book',
        author: 'Writer',
        isbn: '978-0-11-111111-1',
        publicationYear: 2024,
        totalQuantity: 1,
      };
      const req = {};
      booksService.create.mockResolvedValue(mockBook);

      await controller.create(dto, req as any);

      expect(booksService.create).toHaveBeenCalledWith(dto, undefined);
    });
  });

  describe('findAll', () => {
    it('delegates to service.findAll with query params', async () => {
      const search = { q: 'fiction', page: 2, limit: 20 };
      const paginated = {
        data: [mockBook],
        total: 1,
        page: 2,
        limit: 20,
        totalPages: 1,
      };
      booksService.findAll.mockResolvedValue(paginated);

      const result = await controller.findAll(search);

      expect(booksService.findAll).toHaveBeenCalledWith(search);
      expect(result).toEqual(paginated);
    });
  });

  describe('findOne', () => {
    it('delegates to service.findOne and returns book', async () => {
      booksService.findOne.mockResolvedValue(mockBook);

      const result = await controller.findOne('book-1');

      expect(booksService.findOne).toHaveBeenCalledWith('book-1');
      expect(result).toEqual(mockBook);
    });
  });

  describe('update', () => {
    it('calls service.update with id, dto and cover from request when present', async () => {
      const dto: UpdateBookDto = { title: 'Updated Title' };
      const req = { [COVER_URL_OR_PATH_KEY]: 'uploads/new-cover.jpg' };
      const updated = { ...mockBook, title: 'Updated Title' };
      booksService.update.mockResolvedValue(updated as Book);

      const result = await controller.update('book-1', dto, req as any);

      expect(booksService.update).toHaveBeenCalledWith(
        'book-1',
        dto,
        'uploads/new-cover.jpg',
      );
      expect(result).toEqual(updated);
    });

    it('calls service.update with undefined cover when request has no cover', async () => {
      const dto: UpdateBookDto = { author: 'New Author' };
      const req = {};
      booksService.update.mockResolvedValue(mockBook);

      await controller.update('book-1', dto, req as any);

      expect(booksService.update).toHaveBeenCalledWith(
        'book-1',
        dto,
        undefined,
      );
    });
  });
});
