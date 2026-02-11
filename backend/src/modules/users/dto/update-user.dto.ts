import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({
    enum: Role,
    description: 'User role: admin, librarian, or member',
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
