export interface AuthenticatedUser {
  id: string;
  username: string;
  tenantId: string;
  warehouseId: string;
  roles: string[];
  mustChangePassword: boolean;
}
