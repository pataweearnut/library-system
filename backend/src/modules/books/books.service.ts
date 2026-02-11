import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Book } from './book.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { SearchBooksDto } from './dto/search-books.dto';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { LoggerService } from '../../common/logger/logger.service';

const BOOKS_CACHE_TTL_SEC = 60;
const AVAILABILITY_SELECT = ['id', 'availableQuantity'] as const;

export type PaginatedBooksResult = {
  data: Book[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly booksRepo: Repository<Book>,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateBookDto, coverImagePath?: string): Promise<Book> {
    await this.ensureIsbnUnique(dto.isbn);

    const book = this.booksRepo.create({
      ...dto,
      availableQuantity: dto.availableQuantity ?? dto.totalQuantity,
      coverImagePath,
    });
    const saved = await this.booksRepo.save(book);
    void this.redis.invalidateBooksCache();
    return saved;
  }

  async findAll(search?: SearchBooksDto): Promise<PaginatedBooksResult> {
    const q = search?.q?.trim() ?? '';
    const page = Math.max(1, search?.page ?? 1);
    const limit = Math.min(100, Math.max(1, search?.limit ?? 10));
    const cacheKey = this.buildCacheKey(q, page, limit);

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        const result = JSON.parse(cached) as PaginatedBooksResult;
        return this.mergeFreshAvailability(result);
      } catch (err) {
        this.logger.warn(
          BooksService.name,
          `Books cache invalid or corrupted for key "${cacheKey}", falling back to DB: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const result = await this.findAllFromDb(q, page, limit);
    const toStore = this.stripAvailabilityForCache(result);
    await this.redis.set(
      cacheKey,
      JSON.stringify(toStore),
      BOOKS_CACHE_TTL_SEC,
    );
    return result;
  }

  private buildCacheKey(q: string, page: number, limit: number): string {
    return q.length > 0
      ? `books:search:${q.toLowerCase()}:${page}:${limit}`
      : `books:list:${page}:${limit}`;
  }

  /** Cache stores books without availability to keep payload small and semantics clear. */
  private stripAvailabilityForCache(result: PaginatedBooksResult): {
    data: Omit<Book, 'availableQuantity'>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    return {
      ...result,
      data: result.data.map(({ availableQuantity: _q, ...rest }) => rest),
    };
  }

  /** Refetch availableQuantity from DB; availability is never served from cache. */
  private async mergeFreshAvailability(
    result: PaginatedBooksResult,
  ): Promise<PaginatedBooksResult> {
    if (result.data.length === 0) return result;
    const ids = result.data.map((b) => b.id);
    const fresh = await this.booksRepo.find({
      where: { id: In(ids) },
      select: [...AVAILABILITY_SELECT],
    });
    const availabilityById = new Map(
      fresh.map((b) => [b.id, b.availableQuantity]),
    );
    for (const book of result.data) {
      book.availableQuantity = availabilityById.get(book.id) ?? 0;
    }
    return result;
  }

  private async findAllFromDb(
    q: string,
    page: number,
    limit: number,
  ): Promise<PaginatedBooksResult> {
    const where = q
      ? [{ title: ILike(`%${q}%`) }, { author: ILike(`%${q}%`) }]
      : {};
    const skip = (page - 1) * limit;

    const [data, total] = await this.booksRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Book> {
    const book = await this.booksRepo.findOne({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  async update(
    id: string,
    dto: UpdateBookDto,
    coverImagePath?: string,
  ): Promise<Book> {
    const book = await this.findOne(id);
    if (dto.isbn && dto.isbn !== book.isbn) {
      await this.ensureIsbnUnique(dto.isbn, book.id);
    }

    const oldTotal = book.totalQuantity;
    Object.assign(book, dto);

    if (coverImagePath !== undefined) {
      book.coverImagePath = coverImagePath;
    }

    if (dto.totalQuantity !== undefined && dto.totalQuantity !== oldTotal) {
      const delta = dto.totalQuantity - oldTotal;
      book.availableQuantity = Math.min(
        book.totalQuantity,
        Math.max(0, book.availableQuantity + delta),
      );
    }

    const saved = await this.booksRepo.save(book);
    void this.redis.invalidateBooksCache();
    return saved;
  }

  private async ensureIsbnUnique(isbn: string, ignoreBookId?: string) {
    if (!isbn) return;
    const existing = await this.booksRepo.findOne({ where: { isbn } });
    if (existing && existing.id !== ignoreBookId) {
      throw new BadRequestException('ISBN already exists');
    }
  }
}
