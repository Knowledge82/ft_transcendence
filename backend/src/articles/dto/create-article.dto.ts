import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(150, { message: 'El título no puede superar los 150 caracteres' })
  title: string;

  @IsString()
  @MinLength(50, { message: 'El artículo debe tener al menos 50 caracteres' })
  @MaxLength(5000, { message: 'El artículo no puede superar los 5000 caracteres' })
  content: string;
}
