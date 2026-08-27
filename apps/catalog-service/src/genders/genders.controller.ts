import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { GendersService } from './genders.service';
import { CreateGenderDto } from './dto/create-gender.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';

@ApiTags('Genders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'genders', version: '1' })
export class GendersController {
  constructor(private readonly gendersService: GendersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar géneros del catálogo' })
  findAll() {
    return this.gendersService.findAll();
  }

  @Get(':id')
  @ApiParam({ name: 'id' })
  findById(@Param('id') id: string) {
    return this.gendersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear género' })
  create(@Body() dto: CreateGenderDto) {
    return this.gendersService.create(dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateGenderDto>) {
    return this.gendersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id' })
  async remove(@Param('id') id: string) {
    await this.gendersService.remove(id);
  }
}
