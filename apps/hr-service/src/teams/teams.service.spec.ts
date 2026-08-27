import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { DatabaseService } from '@app/database';
import { faker } from '@faker-js/faker';

function makeTeam(warehouseId = faker.string.uuid()) {
  return {
    id: faker.string.uuid(),
    dni: faker.string.numeric(8),
    name: faker.person.firstName(),
    surname: faker.person.lastName(),
    salary: 1200.00,
    warehouseId,
    userId: null,
    isDeleted: false,
    user: null,
    attendances: [],
    payments: [],
    _count: { attendances: 0, payments: 0 },
  };
}

const mockDb = {
  team: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('TeamsService', () => {
  let service: TeamsService;
  const warehouseId = faker.string.uuid();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();
    service = module.get<TeamsService>(TeamsService);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('crea un miembro del equipo sin duplicar DNI en el mismo almacén', async () => {
      const team = makeTeam(warehouseId);
      mockDb.team.findFirst.mockResolvedValue(null); // DNI no existe aún
      mockDb.team.create.mockResolvedValue(team);

      const result = await service.create({
        dni: team.dni, name: team.name, surname: team.surname,
        salary: team.salary, warehouseId,
      });

      expect(result.dni).toBe(team.dni);
      expect(mockDb.team.create).toHaveBeenCalledTimes(1);
    });

    it('lanza ConflictException si el DNI ya existe en el warehouse', async () => {
      const team = makeTeam(warehouseId);
      mockDb.team.findFirst.mockResolvedValue(team); // DNI ya existe

      await expect(
        service.create({ dni: team.dni, name: 'Otro', surname: 'Nombre', salary: 900, warehouseId }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById()', () => {
    it('lanza NotFoundException si el miembro no existe', async () => {
      mockDb.team.findFirst.mockResolvedValue(null);
      await expect(service.findById(faker.string.uuid())).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('hace soft-delete (isDeleted: true)', async () => {
      const team = makeTeam(warehouseId);
      mockDb.team.findFirst.mockResolvedValue(team);
      mockDb.team.update.mockResolvedValue({ ...team, isDeleted: true });

      await service.remove(team.id);

      expect(mockDb.team.update).toHaveBeenCalledWith({
        where: { id: team.id },
        data: { isDeleted: true },
      });
    });
  });

  describe('fullName()', () => {
    it('concatena nombre y apellido correctamente', () => {
      const name = service.fullName({ name: 'María', surname: 'García' });
      expect(name).toBe('María García');
    });
  });
});
