import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BorrowBookDto {
  @ApiProperty({ description: 'UUID of the book to borrow' })
  @IsUUID()
  bookId: string;
}
