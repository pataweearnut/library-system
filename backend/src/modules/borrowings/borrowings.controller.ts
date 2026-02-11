import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { BorrowingsService } from './borrowings.service';
import { BorrowBookDto } from './dto/borrow-book.dto';
import { ReturnBookDto } from './dto/return-book.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@ApiTags('borrowings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('borrowings')
export class BorrowingsController {
  constructor(private readonly borrowingsService: BorrowingsService) {}

  @Post('borrow')
  @ApiOperation({ summary: 'Borrow a book' })
  @ApiResponse({ status: 201, description: 'Borrowing created' })
  @ApiResponse({
    status: 400,
    description: 'No copies available or invalid request',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Book or user not found' })
  borrow(@Req() req: RequestWithUser, @Body() dto: BorrowBookDto) {
    return this.borrowingsService.borrow(req.user.userId, dto);
  }

  @Post('return')
  @ApiOperation({ summary: 'Return a borrowed book' })
  @ApiResponse({ status: 200, description: 'Borrowing returned' })
  @ApiResponse({
    status: 400,
    description: 'Already returned or not your borrowing',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Borrowing not found' })
  return(@Req() req: RequestWithUser, @Body() dto: ReturnBookDto) {
    return this.borrowingsService.return(req.user.userId, dto);
  }

  @Get('book/:bookId/active')
  @ApiOperation({ summary: "Current user's active borrowings for a book" })
  @ApiResponse({ status: 200, description: 'List of active borrowings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  myActiveBorrowings(
    @Req() req: RequestWithUser,
    @Param('bookId') bookId: string,
  ) {
    return this.borrowingsService.myActiveBorrowingsForBook(
      req.user.userId,
      bookId,
    );
  }

  @Get('book/:bookId/history')
  @Roles(Role.ADMIN, Role.LIBRARIAN)
  @ApiOperation({
    summary: 'Borrowing history for a book (admin/librarian), paginated',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default 10)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Paginated list of borrowings (data, total, page, limit, totalPages)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  history(
    @Param('bookId') bookId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.borrowingsService.historyForBook(
      bookId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('most-borrowed')
  @Roles(Role.ADMIN, Role.LIBRARIAN)
  @ApiOperation({ summary: 'Most borrowed books (admin/librarian)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max number of results (default 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of { bookId, title, borrowCount }',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  mostBorrowed(@Query('limit') limit = '10') {
    return this.borrowingsService.mostBorrowed(Number(limit));
  }
}
