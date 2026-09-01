function ones(n: number): string {
  const words = [
    '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE',
    'DIECIOCHO', 'DIECINUEVE', 'VEINTE',
  ];
  return words[n] ?? '';
}

function tens(n: number): string {
  if (n <= 20) return ones(n);
  const labels = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const base = labels[Math.floor(n / 10)] ?? '';
  const remainder = n % 10;
  return remainder ? `${base} Y ${ones(remainder)}` : base;
}

function hundreds(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const labels = [
    '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
    'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
  ];
  const base = labels[Math.floor(n / 100)] ?? '';
  const remainder = n % 100;
  return remainder ? `${base} ${tens(remainder)}`.trim() : base;
}

function intToWords(n: number): string {
  if (n === 0) return 'CERO';

  const parts: string[] = [];

  if (n >= 1_000_000) {
    const millions = Math.floor(n / 1_000_000);
    parts.push(millions === 1 ? 'UN MILLÓN' : `${hundreds(millions)} MILLONES`);
    n %= 1_000_000;
  }

  if (n >= 1_000) {
    const thousands = Math.floor(n / 1_000);
    parts.push(thousands === 1 ? 'MIL' : `${hundreds(thousands)} MIL`);
    n %= 1_000;
  }

  if (n > 0) {
    parts.push(hundreds(n));
  }

  return parts.filter(Boolean).join(' ');
}

export function formatAmountInWords(total: number): string {
  const [integerPart, decimalPart = '00'] = total.toFixed(2).split('.');
  return `${intToWords(Number(integerPart))} CON ${decimalPart}/100 SOLES`;
}
