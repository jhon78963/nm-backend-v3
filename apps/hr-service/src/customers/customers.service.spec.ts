import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '@app/database';
import { CustomersService } from './customers.service';
import { DocumentLookupService } from './document-lookup.service';

const warehouseId = 'warehouse-uuid';

const localCustomer = {
  id: 'customer-uuid',
  documentType: 'DNI',
  documentNumber: '74935445',
  name: 'JUAN PEREZ GARCIA',
  warehouseId,
  isDeleted: false,
};

describe('CustomersService', () => {
  let service: CustomersService;
  let db: {
    customer: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };
  let documentLookup: { lookupDocument: jest.Mock };

  beforeEach(async () => {
    db = {
      customer: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    documentLookup = {
      lookupDocument: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: DatabaseService, useValue: db },
        { provide: DocumentLookupService, useValue: documentLookup },
      ],
    }).compile();

    service = module.get(CustomersService);
  });

  describe('searchForPos', () => {
    it('returns local customer when document already exists', async () => {
      db.customer.findFirst.mockResolvedValue(localCustomer);

      const result = await service.searchForPos('74935445', warehouseId);

      expect(db.customer.findFirst).toHaveBeenCalledWith({
        where: {
          warehouseId,
          isDeleted: false,
          documentNumber: '74935445',
        },
      });
      expect(documentLookup.lookupDocument).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'customer-uuid',
        dni: '74935445',
        name: 'JUAN PEREZ GARCIA',
        document_type: 'DNI',
        document_number: '74935445',
      });
    });

    it('creates customer from external lookup when not found locally', async () => {
      db.customer.findFirst.mockResolvedValue(null);
      documentLookup.lookupDocument.mockResolvedValue({
        documentType: 'DNI',
        documentNumber: '74935445',
        name: 'JUAN PEREZ GARCIA',
      });
      db.customer.create.mockResolvedValue(localCustomer);

      const result = await service.searchForPos('74935445', warehouseId);

      expect(documentLookup.lookupDocument).toHaveBeenCalledWith('74935445');
      expect(db.customer.create).toHaveBeenCalledWith({
        data: {
          documentType: 'DNI',
          documentNumber: '74935445',
          name: 'JUAN PEREZ GARCIA',
          warehouseId,
        },
      });
      expect(result.dni).toBe('74935445');
    });

    it('rejects invalid document lengths', async () => {
      await expect(service.searchForPos('123', warehouseId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(documentLookup.lookupDocument).not.toHaveBeenCalled();
    });
  });
});
