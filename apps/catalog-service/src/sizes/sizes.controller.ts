import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { SizesService } from './sizes.service';
import { CreateSizeDto } from './dto/create-size.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';

@ApiTags('Sizes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'sizes', version: '1' })
export class SizesController {
  constructor(private readonly sizesService: SizesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tallas del catálogo' })
  @ApiQuery({ name: 'sizeTypeId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  findAll(@Query() query: Record<string, string | undefined>) {
    const { sizeTypeId, productId, search } = query;

    if (productId) {
      const typeIds = sizeTypeId
        ? sizeTypeId.split(',').map((id) => id.trim()).filter(Boolean)
        : [];
      return this.sizesService.findForProductSelection(productId, typeIds);
    }

    if (query.limit !== undefined || query.page !== undefined) {
      return this.sizesService.findAllPaginated(query, sizeTypeId);
    }

    return this.sizesService.findAll(sizeTypeId, search);
  }

  @Get('size-types')
  @ApiOperation({ summary: 'Listar tipos de talla' })
  findAllSizeTypes() {
    return this.sizesService.findAllSizeTypes();
  }

  @Get(':id')
  @ApiParam({ name: 'id' })
  findById(@Param('id') id: string) {
    return this.sizesService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear talla' })
  create(@Body() dto: CreateSizeDto) {
    return this.sizesService.create(dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateSizeDto>) {
    return this.sizesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id' })
  async remove(@Param('id') id: string) {
    await this.sizesService.remove(id);
  }
}
