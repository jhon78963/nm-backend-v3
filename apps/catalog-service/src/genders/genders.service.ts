import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { CreateGenderDto } from './dto/create-gender.dto';

@Injectable()
export class GendersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.gender.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    const gender = await this.db.gender.findFirst({ where: { id } });
    if (!gender) throw new NotFoundException('Género no encontrado.');
    return gender;
  }

  async create(dto: CreateGenderDto) {
    return this.db.gender.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateGenderDto>) {
    await this.findById(id);
    return this.db.gender.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.db.gender.delete({ where: { id } });
  }
}
