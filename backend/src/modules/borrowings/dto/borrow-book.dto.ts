import { IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const UUID_LENGTH = 36;

export class BorrowBookDto {
  @ApiProperty({ description: 'UUID of the book to borrow', maxLength: UUID_LENGTH })
  @IsUUID()
  @MaxLength(UUID_LENGTH)
  bookId: string;
}
