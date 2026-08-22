import { IsOptional, IsString, MinLength, MaxLength, IsInt, Min, Max } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  displayName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  avatarPositionX?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  avatarPositionY?: number;
}
