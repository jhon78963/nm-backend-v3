export interface ShippingMethodDefinition {
  id: string;
  title: string;
  cost: number;
  zones: Array<'trujillo' | 'la-libertad' | 'national'>;
}

export const SHIPPING_METHODS: ShippingMethodDefinition[] = [
  {
    id: 'pickup-mayorista',
    title: 'Recojo en tienda — Mercado Mayorista (Puesto C-74, Trujillo)',
    cost: 0,
    zones: ['trujillo'],
  },
  {
    id: 'pickup-acomar',
    title: 'Recojo en tienda — Mercado Acomar (Puesto 70, Manuel Arévalo)',
    cost: 0,
    zones: ['trujillo'],
  },
  {
    id: 'delivery-trujillo',
    title: 'Delivery local Trujillo (motorizado)',
    cost: 8,
    zones: ['trujillo'],
  },
  {
    id: 'olva',
    title: 'Envío por agencia Olva',
    cost: 15,
    zones: ['la-libertad', 'national'],
  },
  {
    id: 'shalom',
    title: 'Envío por agencia Shalom',
    cost: 12,
    zones: ['la-libertad', 'national'],
  },
  {
    id: 'libertad-provincias',
    title: 'Envío por agencia — provincias de La Libertad (fuera de Trujillo)',
    cost: 10,
    zones: ['la-libertad'],
  },
];

export const PAYMENT_METHODS = [
  { id: 'culqi', title: 'Tarjetas, Yape y más (Culqi)', trujilloOnly: false },
  { id: 'bacs', title: 'Transferencia / Yape / Plin', trujilloOnly: false },
] as const;

export type ShippingZone = 'trujillo' | 'la-libertad' | 'national';

export function resolveShippingZone(state: string, postcode: string): ShippingZone {
  const normalizedState = state.trim().toUpperCase();
  const normalizedPostcode = postcode.trim();

  if (normalizedState === 'LAL' && normalizedPostcode.startsWith('130')) {
    return 'trujillo';
  }

  if (normalizedState === 'LAL') {
    return 'la-libertad';
  }

  return 'national';
}

export function getShippingMethod(id: string, zone: ShippingZone) {
  return SHIPPING_METHODS.find((method) => method.id === id && method.zones.includes(zone));
}

export function getPaymentMethod(id: string) {
  return PAYMENT_METHODS.find((method) => method.id === id);
}
