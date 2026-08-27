import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ColorsService } from './colors.service';
import { CreateColorDto } from './dto/create-color.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';

@ApiTags('Colors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'colors', version: '1' })
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los colores del catálogo' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'sizeId', required: false })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  findAll(@Query() query: Record<string, string | undefined>) {
    const { productId, sizeId, search } = query;

    if (productId) {
      return this.colorsService.findUsedInProduct(productId, sizeId);
    }

    if (query.limit !== undefined || query.page !== undefined) {
      return this.colorsService.findAllPaginated(query);
    }

    return this.colorsService.findAll(search);
  }

  @Get(':id')
  @ApiParam({ name: 'id' })
  findById(@Param('id') id: string) {
    return this.colorsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear color' })
  create(@Body() dto: CreateColorDto) {
    return this.colorsService.create(dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateColorDto>) {
    return this.colorsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id' })
  async remove(@Param('id') id: string) {
    await this.colorsService.remove(id);
  }
}
