import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { SearchBooksDto } from './dto/search-books.dto';
import { SingleFileUploadInterceptor } from '../../common/interceptors/single-file-upload.interceptor';

export const COVER_FIELD_NAME = 'cover';
export const COVER_URL_OR_PATH_KEY = 'coverUrlOrPath';
export const UPLOADS_DIR = 'uploads';

const apiBodyWithOptionalCover = {
  schema: {
    type: 'object',
    required: ['title', 'author', 'isbn', 'publicationYear', 'totalQuantity'],
    properties: {
      title: { type: 'string' },
      author: { type: 'string' },
      isbn: { type: 'string' },
      publicationYear: { type: 'number' },
      totalQuantity: { type: 'number' },
      cover: {
        type: 'string',
        format: 'binary',
        description: 'Optional cover image',
      },
    },
  },
};

@ApiTags('books')
@ApiBearerAuth()
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @UseInterceptors(SingleFileUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new book (admin/librarian)' })
  @ApiResponse({ status: 201, description: 'Book created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBody(apiBodyWithOptionalCover)
  async create(@Body() dto: CreateBookDto, @Req() req: Request) {
    const coverUrl = (req as Request & { [COVER_URL_OR_PATH_KEY]?: string })[
      COVER_URL_OR_PATH_KEY
    ];
    return this.booksService.create(dto, coverUrl ?? undefined);
  }

  @Get()
  @ApiOperation({
    summary: 'List books with optional search (title or author) and pagination',
  })
  @ApiResponse({
    status: 200,
    description:
      'Paginated list of books (data, total, page, limit, totalPages)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() search: SearchBooksDto) {
    return this.booksService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a book by ID' })
  @ApiResponse({ status: 200, description: 'Book details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(SingleFileUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a book (admin/librarian)' })
  @ApiResponse({ status: 200, description: 'Book updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  @ApiBody(apiBodyWithOptionalCover)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
    @Req() req: Request,
  ) {
    const coverPath = (req as Request & { [COVER_URL_OR_PATH_KEY]?: string })[
      COVER_URL_OR_PATH_KEY
    ];
    return this.booksService.update(id, dto, coverPath ?? undefined);
  }
}
