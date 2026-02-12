import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';
import { ApiProperty } from '@nestjs/swagger';

const EMAIL_MAX = 255;
const PASSWORD_MAX = 128;

export class CreateUserDto {
  @ApiProperty({ maxLength: EMAIL_MAX })
  @IsEmail()
  @MaxLength(EMAIL_MAX)
  email: string;

  @ApiProperty({ minLength: 6, maxLength: PASSWORD_MAX })
  @IsString()
  @MinLength(6)
  @MaxLength(PASSWORD_MAX)
  password: string;

  @ApiProperty({ enum: Role, required: false })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
