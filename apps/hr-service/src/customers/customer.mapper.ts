type CustomerRecord = {
  id: string;
  documentType: string | null;
  documentNumber: string | null;
  name: string;
  warehouseId: string;
  isDeleted: boolean;
};

export function mapCustomerInput(dto: {
  dni: string;
  name: string;
  surname: string;
}) {
  return {
    documentType: 'DNI',
    documentNumber: dto.dni.trim(),
    name: `${dto.name.trim()} ${dto.surname.trim()}`.trim(),
  };
}

export function mapCustomerResponse(customer: CustomerRecord) {
  const fullName = customer.name.trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const surname = parts.length > 1 ? parts[parts.length - 1] : '';
  const name = parts.length > 1 ? parts.slice(0, -1).join(' ') : fullName;

  return {
    id: customer.id,
    dni: customer.documentNumber ?? '',
    name,
    surname,
    documentType: customer.documentType,
    documentNumber: customer.documentNumber,
    warehouseId: customer.warehouseId,
  };
}
