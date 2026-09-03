export interface AuthenticatedCustomer {
  id: string;
  email: string;
  name: string;
}

export interface CustomerJwtPayload {
  sub: string;
  email: string;
  name: string;
  actorType: 'customer';
}
