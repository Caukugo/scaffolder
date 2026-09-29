import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationMetaDto, PaginationQueryDto } from '../common/dto/pagination.dto';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Nome da categoria', example: 'Infraestrutura', minLength: 2, maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'O nome deve ter no mínimo 2 caracteres.' })
  @MaxLength(40, { message: 'O nome deve ter no máximo 40 caracteres.' })
  name!: string;

  @ApiPropertyOptional({ description: 'Descrição da categoria', example: 'Tarefas de plataforma e ambiente.', maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240, { message: 'A descrição deve ter no máximo 240 caracteres.' })
  description?: string;

  @ApiPropertyOptional({ description: 'Cor de identificação em hexadecimal', example: '#2563EB', default: '#2563EB' })
  @IsOptional()
  @IsHexColor({ message: 'A cor deve estar em formato hexadecimal (ex.: #2563EB).' })
  color?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Nome da categoria', example: 'Infraestrutura e DevOps', minLength: 2, maxLength: 40 })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'O nome deve ter no mínimo 2 caracteres.' })
  @MaxLength(40, { message: 'O nome deve ter no máximo 40 caracteres.' })
  name?: string;

  @ApiPropertyOptional({ description: 'Descrição da categoria', maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240, { message: 'A descrição deve ter no máximo 240 caracteres.' })
  description?: string;

  @ApiPropertyOptional({ description: 'Cor de identificação em hexadecimal', example: '#DC2626' })
  @IsOptional()
  @IsHexColor({ message: 'A cor deve estar em formato hexadecimal (ex.: #2563EB).' })
  color?: string;
}

export class CategorySummaryDto {
  @ApiProperty({ description: 'Identificador único da categoria', example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  id!: string;

  @ApiProperty({ description: 'Nome da categoria', example: 'Infraestrutura' })
  name!: string;

  @ApiProperty({ description: 'Cor de identificação em hexadecimal', example: '#2563EB' })
  color!: string;
}

export class CategoryDto {
  @ApiProperty({ description: 'Identificador único da categoria', example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  id!: string;

  @ApiProperty({ description: 'Nome da categoria', example: 'Infraestrutura' })
  name!: string;

  @ApiPropertyOptional({ description: 'Descrição da categoria', type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Cor de identificação em hexadecimal', example: '#2563EB' })
  color!: string;

  @ApiProperty({ description: 'Identificador do usuário proprietário', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  ownerId!: string;

  @ApiProperty({ description: 'Quantidade de tarefas ativas vinculadas à categoria', example: 3 })
  taskCount!: number;

  @ApiProperty({ description: 'Data de criação' })
  createdAt!: string;

  @ApiProperty({ description: 'Data de última atualização' })
  updatedAt!: string;
}

export class PaginatedCategoriesResponseDto {
  @ApiProperty({ description: 'Lista de categorias paginadas', type: [CategoryDto] })
  data!: CategoryDto[];

  @ApiProperty({ description: 'Metadados de paginação', type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class ListCategoriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Campo de ordenação', enum: ['name', 'createdAt'], default: 'name' })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'createdAt' = 'name';

  @ApiPropertyOptional({ description: 'Direção da ordenação', enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
