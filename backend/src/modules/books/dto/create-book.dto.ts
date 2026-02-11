import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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

export class CreateBookDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  isbn: string;

  @ApiProperty()
  @Transform(({ value }: { value: unknown }) => toNumber(value))
  @IsInt()
  publicationYear: number;

  @ApiProperty()
  @Transform(({ value }: { value: unknown }) => toNumber(value))
  @IsInt()
  @Min(0)
  totalQuantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === '' ? undefined : toNumber(value),
  )
  @IsInt()
  @Min(0)
  availableQuantity?: number;
}
