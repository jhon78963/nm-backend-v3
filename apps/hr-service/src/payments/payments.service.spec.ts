import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PayrollCalculatorService } from './payroll-calculator.service';
import { DatabaseService } from '@app/database';
import { faker } from '@faker-js/faker';
import { PaymentType, PaymentMethod } from './dto/create-payment.dto';

function makePayment(teamId = faker.string.uuid()) {
  return {
    id: faker.string.uuid(),
    teamId,
    type: 'PAYMENT',
    amount: 1200.00,
    date: new Date(),
    payrollPeriod: 'q2',
    accountingMonth: '2026-08',
    paymentMethod: 'CASH',
    team: { id: teamId, name: 'Ana', surname: 'García' },
  };
}

const mockDb = {
  team: { findFirst: jest.fn() },
  attendance: { findMany: jest.fn() },
  teamPayment: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        PayrollCalculatorService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();
    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('crea el pago si el miembro del equipo existe', async () => {
      const teamId = faker.string.uuid();
      const payment = makePayment(teamId);
      mockDb.team.findFirst.mockResolvedValue({ id: teamId });
      mockDb.teamPayment.create.mockResolvedValue(payment);

      const result = await service.create(
        {
          teamId,
          type: PaymentType.PAYMENT,
          amount: 1200,
          date: '2026-08-25',
          accountingMonth: '2026-08',
          paymentMethod: PaymentMethod.CASH,
        },
        faker.string.uuid(),
      );

      expect(result.amount).toBe(1200.00);
    });

    it('lanza NotFoundException si el miembro no existe', async () => {
      mockDb.team.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            teamId: faker.string.uuid(),
            type: PaymentType.PAYMENT,
            amount: 900,
            date: '2026-08-25',
            accountingMonth: '2026-08',
            paymentMethod: PaymentMethod.CASH,
          },
          faker.string.uuid(),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPayrollForTeam()', () => {
    it('calcula la nómina del colaborador con asistencia y movimientos', async () => {
      const teamId = faker.string.uuid();
      mockDb.team.findFirst.mockResolvedValue({
        id: teamId,
        name: 'Ana',
        surname: 'García',
        dni: '12345678',
        salary: 1250,
      });
      mockDb.attendance.findMany.mockResolvedValue([
        {
          date: new Date('2026-07-01'),
          status: 'PUNTUAL',
          checkIn: new Date('2026-07-01T08:00:00'),
          checkOut: new Date('2026-07-01T19:30:00'),
        },
      ]);
      mockDb.teamPayment.findMany.mockResolvedValue([]);

      const result = await service.getPayrollForTeam(
        faker.string.uuid(),
        teamId,
        7,
        2026,
        'full',
      );

      expect(result.success).toBe(true);
      expect(result.data.team.salary).toBe(1250);
      expect(result.data.estimates.salarioBase).toBe(1250);
      expect(result.data.attendanceVista.falta).toBe(0);
    });

    it('lanza NotFoundException si el colaborador no existe', async () => {
      mockDb.team.findFirst.mockResolvedValue(null);

      await expect(
        service.getPayrollForTeam(faker.string.uuid(), faker.string.uuid(), 7, 2026, 'full'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
