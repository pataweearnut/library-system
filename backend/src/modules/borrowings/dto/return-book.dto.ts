import { IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const UUID_LENGTH = 36;

export class ReturnBookDto {
  @ApiProperty({
    description: 'UUID of the borrowing record to return',
    maxLength: UUID_LENGTH,
  })
  @IsUUID()
  @MaxLength(UUID_LENGTH)
  borrowingId: string;
}
