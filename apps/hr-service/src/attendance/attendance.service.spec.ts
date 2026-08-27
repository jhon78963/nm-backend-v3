import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { DatabaseService } from '@app/database';
import { faker } from '@faker-js/faker';
import { AttendanceStatus } from './dto/record-attendance.dto';

const mockDb = {
  attendance: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  team: { findMany: jest.fn() },
};

describe('AttendanceService', () => {
  let service: AttendanceService;
  const warehouseId = faker.string.uuid();
  const teamId = faker.string.uuid();
  const date = '2026-08-25';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();
    service = module.get<AttendanceService>(AttendanceService);
    jest.clearAllMocks();
  });

  describe('record()', () => {
    it('crea un nuevo registro de asistencia si no existe para ese día', async () => {
      mockDb.attendance.findUnique.mockResolvedValue(null);
      mockDb.attendance.create.mockResolvedValue({ id: faker.string.uuid(), teamId, date, status: 'PUNTUAL' });

      await service.record({ teamId, date, status: AttendanceStatus.PUNTUAL });

      expect(mockDb.attendance.create).toHaveBeenCalledTimes(1);
      expect(mockDb.attendance.update).not.toHaveBeenCalled();
    });

    it('actualiza el registro si ya existe para ese día (upsert behavior)', async () => {
      mockDb.attendance.findUnique.mockResolvedValue({ id: faker.string.uuid(), teamId, date });
      mockDb.attendance.update.mockResolvedValue({});

      await service.record({ teamId, date, status: AttendanceStatus.TARDE, delayMinutes: 15 });

      expect(mockDb.attendance.update).toHaveBeenCalledTimes(1);
      expect(mockDb.attendance.create).not.toHaveBeenCalled();
    });

    it('registra delayMinutes = 0 por defecto cuando no se provee', async () => {
      mockDb.attendance.findUnique.mockResolvedValue(null);
      mockDb.attendance.create.mockResolvedValue({});

      await service.record({ teamId, date, status: AttendanceStatus.PUNTUAL });

      expect(mockDb.attendance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ delayMinutes: 0 }),
        }),
      );
    });
  });

  describe('getDailySummary()', () => {
    it('retorna NOT_RECORDED para miembros sin registro del día', async () => {
      mockDb.team.findMany.mockResolvedValue([
        { id: teamId, name: 'Ana', surname: 'García', attendances: [] },
        { id: faker.string.uuid(), name: 'Luis', surname: 'Pérez', attendances: [{ status: 'PUNTUAL' }] },
      ]);

      const result = await service.getDailySummary(warehouseId, date);

      expect(result[0].status).toBe('NOT_RECORDED');
      expect(result[1].status).toBe('PUNTUAL');
    });
  });

  describe('getByMonth()', () => {
    it('cuenta días PUNTUAL, TOLERANCIA, TARDE y RECUPERACION como presentes', async () => {
      mockDb.team.findMany.mockResolvedValue([{
        id: teamId, name: 'Ana', surname: 'García',
        attendances: [
          { status: 'PUNTUAL', delayMinutes: 0, date: new Date('2026-08-01') },
          { status: 'TARDE', delayMinutes: 10, date: new Date('2026-08-02') },
          { status: 'FALTA', delayMinutes: 0, date: new Date('2026-08-03') },
          { status: 'RECUPERACION', delayMinutes: 0, date: new Date('2026-08-04') },
        ],
      }]);

      const result = await service.getByMonth(warehouseId, '2026-08');

      expect(result[0].presentDays).toBe(3);
      expect(result[0].absentDays).toBe(1);
      expect(result[0].totalDelayMinutes).toBe(10);
    });
  });
});
