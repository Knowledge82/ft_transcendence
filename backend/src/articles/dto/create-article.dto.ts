import { IsString, IsOptional, IsInt, MinLength, MaxLength } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(150, { message: 'El título no puede superar los 150 caracteres' })
  title: string;

  @IsString()
  @MinLength(50, { message: 'El artículo debe tener al menos 50 caracteres' })
  @MaxLength(2000, { message: 'El artículo no puede superar los 2000 caracteres' })
  content: string;

  // Present only when writing an internal treatise for a specific
  // faction — absent (undefined) means a normal public library article
  @IsOptional()
  @IsInt()
  organizationId?: number;
}
