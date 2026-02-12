import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function toNumber(value: unknown): number {
  // Handle arrays from multipart/form-data (e.g. ['2024'])
  const raw: unknown = Array.isArray(value) ? value[0] : value;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return NaN;
    return Number.parseInt(trimmed, 10);
  }
  return NaN;
}

const TITLE_MAX = 500;
const AUTHOR_MAX = 300;
const ISBN_MAX = 20;
const PUBLICATION_YEAR_MAX = 2500;
const QUANTITY_MAX = 10_000;

export class CreateBookDto {
  @ApiProperty({ maxLength: TITLE_MAX })
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX)
  title: string;

  @ApiProperty({ maxLength: AUTHOR_MAX })
  @IsString()
  @IsNotEmpty()
  @MaxLength(AUTHOR_MAX)
  author: string;

  @ApiProperty({ maxLength: ISBN_MAX })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ISBN_MAX)
  isbn: string;

  @ApiProperty({ minimum: 1, maximum: PUBLICATION_YEAR_MAX })
  @Transform(({ value }: { value: unknown }) => toNumber(value))
  @IsInt()
  @Min(1)
  @Max(PUBLICATION_YEAR_MAX)
  publicationYear: number;

  @ApiProperty({ minimum: 0, maximum: QUANTITY_MAX })
  @Transform(({ value }: { value: unknown }) => toNumber(value))
  @IsInt()
  @Min(0)
  @Max(QUANTITY_MAX)
  totalQuantity: number;

  @ApiProperty({ required: false, minimum: 0, maximum: QUANTITY_MAX })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === '' ? undefined : toNumber(value),
  )
  @IsInt()
  @Min(0)
  @Max(QUANTITY_MAX)
  availableQuantity?: number;
}
