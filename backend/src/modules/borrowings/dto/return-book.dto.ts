import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReturnBookDto {
  @ApiProperty({ description: 'UUID of the borrowing record to return' })
  @IsUUID()
  borrowingId: string;
}
