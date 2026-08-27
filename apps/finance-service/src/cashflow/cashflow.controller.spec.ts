import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CashflowController } from './cashflow.controller';
import { CashflowService } from './cashflow.service';
import { CreateCashMovementDto, MovementType, CashPaymentMethod } from './dto/create-cash-movement.dto';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

const mockUser: AuthenticatedUser = {
  id: 'user-uuid',
  username: 'admin',
  tenantId: 'tenant-uuid',
  warehouseId: 'warehouse-uuid',
  roles: ['Admin'],
  mustChangePassword: false,
};

const mockMovement = {
  id: 'movement-uuid',
  warehouseId: 'warehouse-uuid',
  type: MovementType.EXPENSE,
  amount: 500,
  category: 'Alquiler',
  paymentMethod: CashPaymentMethod.CASH,
  description: 'Pago mensual de alquiler',
  date: new Date('2026-08-25'),
  accountingMonth: '2026-08',
  isDeleted: false,
  createdById: 'user-uuid',
  vouchers: [],
};

const mockDailyReport = {
  date: '2026-08-25',
  openingBalance: 5000,
  totalIncome: 2000,
  totalExpense: 500,
  closingBalance: 6500,
  movements: [mockMovement],
};

const mockMonthlyReport = {
  accountingMonth: '2026-08',
  warehouseId: 'warehouse-uuid',
  totalIncome: 20000,
  totalExpense: 5000,
  netBalance: 15000,
  incomeCount: 10,
  expenseCount: 3,
  byCategory: [{ category: 'Alquiler', type: 'EXPENSE', amount: 2000 }],
  byPaymentMethod: { CASH: 10000, YAPE: 10000 },
};

describe('CashflowController', () => {
  let controller: CashflowController;
  let service: jest.Mocked<CashflowService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashflowController],
      providers: [
        {
          provide: CashflowService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findById: jest.fn(),
            getDaily: jest.fn(),
            getMonthlyReport: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CashflowController>(CashflowController);
    service = module.get(CashflowService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDaily', () => {
    it('should return daily cashflow report for warehouse', async () => {
      service.getDaily.mockResolvedValue(mockDailyReport as any);
      const result = await controller.getDaily(mockUser, '2026-08-25');
      expect(service.getDaily).toHaveBeenCalledWith('warehouse-uuid', '2026-08-25');
      expect(result).toMatchObject({ closingBalance: 6500 });
    });
  });

  describe('getMonthlyReport', () => {
    it('should return monthly report without warehouseId filter', async () => {
      service.getMonthlyReport.mockResolvedValue(mockMonthlyReport as any);
      const result = await controller.getMonthlyReport('2026-08', undefined);
      expect(service.getMonthlyReport).toHaveBeenCalledWith('2026-08', undefined);
      expect(result).toMatchObject({ netBalance: 15000 });
    });

    it('should forward optional warehouseId to service', async () => {
      service.getMonthlyReport.mockResolvedValue(mockMonthlyReport as any);
      await controller.getMonthlyReport('2026-08', 'warehouse-uuid');
      expect(service.getMonthlyReport).toHaveBeenCalledWith('2026-08', 'warehouse-uuid');
    });
  });

  describe('findById', () => {
    it('should return a single movement with vouchers', async () => {
      service.findById.mockResolvedValue(mockMovement as any);
      const result = await controller.findById('movement-uuid');
      expect(service.findById).toHaveBeenCalledWith('movement-uuid');
      expect(result).toMatchObject({ category: 'Alquiler' });
    });

    it('should propagate NotFoundException', async () => {
      service.findById.mockRejectedValue(new NotFoundException());
      await expect(controller.findById('bad-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a cash movement and return 201', async () => {
      const dto: CreateCashMovementDto = {
        warehouseId: 'warehouse-uuid',
        type: MovementType.EXPENSE,
        amount: 500,
        category: 'Alquiler',
        paymentMethod: CashPaymentMethod.CASH,
        date: '2026-08-25',
        accountingMonth: '2026-08',
      };
      service.create.mockResolvedValue(mockMovement as any);
      const result = await controller.create(dto, mockUser);
      expect(service.create).toHaveBeenCalledWith(dto, 'user-uuid');
      expect(result).toMatchObject({ category: 'Alquiler' });
    });
  });

  describe('update', () => {
    it('should update movement data', async () => {
      const updated = { ...mockMovement, amount: 600 };
      service.update.mockResolvedValue(updated as any);
      const result = await controller.update('movement-uuid', { amount: 600 });
      expect(service.update).toHaveBeenCalledWith('movement-uuid', { amount: 600 });
      expect(result).toMatchObject({ amount: 600 });
    });

    it('should propagate NotFoundException', async () => {
      service.update.mockRejectedValue(new NotFoundException());
      await expect(controller.update('bad-id', {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should soft-delete movement and return undefined (204)', async () => {
      service.delete.mockResolvedValue(undefined);
      const result = await controller.delete('movement-uuid');
      expect(service.delete).toHaveBeenCalledWith('movement-uuid');
      expect(result).toBeUndefined();
    });

    it('should propagate NotFoundException', async () => {
      service.delete.mockRejectedValue(new NotFoundException());
      await expect(controller.delete('bad-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
