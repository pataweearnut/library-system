import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Book } from './book.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { SearchBooksDto } from './dto/search-books.dto';

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
  ) {}

  async create(dto: CreateBookDto, coverImagePath?: string): Promise<Book> {
    await this.ensureIsbnUnique(dto.isbn);

    const book = this.booksRepo.create({
      ...dto,
      availableQuantity: dto.availableQuantity ?? dto.totalQuantity,
      coverImagePath,
    });
    const saved = await this.booksRepo.save(book);
    return saved;
  }

  async findAll(search?: SearchBooksDto): Promise<PaginatedBooksResult> {
    const q = search?.q?.trim() ?? '';
    const page = Math.max(1, search?.page ?? 1);
    const limit = Math.min(100, Math.max(1, search?.limit ?? 10));
    const result = await this.findAllFromDb(q, page, limit);
    
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
