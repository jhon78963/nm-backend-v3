type VendorRecord = {
  id: string;
  name: string;
  address: string | null;
  local?: string | null;
  phone: string | null;
  balance: { toString(): string } | number | string;
  warehouseId: string;
};

export function mapVendorInput(dto: {
  name: string;
  address?: string;
  local?: string;
  phone?: string;
}) {
  return {
    name: dto.name.trim(),
    address: dto.address?.trim() || null,
    local: dto.local?.trim() || null,
    phone: dto.phone?.trim() || null,
  };
}

export function mapVendorResponse(vendor: VendorRecord) {
  return {
    id: vendor.id,
    name: vendor.name,
    address: vendor.address ?? '',
    local: vendor.local ?? '',
    phone: vendor.phone ?? '',
    balance: vendor.balance,
    warehouseId: vendor.warehouseId,
  };
}
