import { escapeHtml, formatAddress, formatMoney, MAIL_THEME, renderDivider } from './layout';

const cellBorder = `border:1px solid ${MAIL_THEME.borderStrong};`;

export function renderSectionTitle(title: string): string {
  return `
    <h2 style="margin:24px 0 16px;color:#444444;font-size:20px;font-weight:700;text-transform:uppercase;text-align:center;line-height:1.2;">
      ${escapeHtml(title)}
    </h2>`;
}

export function renderSubHeading(title: string): string {
  return `
    <h3 style="margin:12px 0 8px;font-weight:700;font-size:18px;line-height:25px;color:${MAIL_THEME.text};text-align:center;">
      ${escapeHtml(title)}
    </h3>`;
}

export function renderMutedNote(text: string): string {
  return `
    <p style="margin:16px 0 0;font-weight:600;font-size:14px;line-height:22px;text-align:center;color:${MAIL_THEME.textMuted};">
      ${escapeHtml(text)}
    </p>`;
}

export function renderSuccessHero(options: {
  title: string;
  subtitle: string;
  meta?: string;
}): string {
  return `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td align="center" style="padding:8px 0 20px;">
          <div style="width:64px;height:64px;line-height:64px;border-radius:50%;background:${MAIL_THEME.primary};color:#ffffff;font-size:30px;font-weight:700;margin:0 auto 16px;">
            &#10003;
          </div>
          <h2 style="margin:0 0 10px;color:#444444;font-size:22px;font-weight:700;text-transform:uppercase;line-height:1.2;">
            ${escapeHtml(options.title)}
          </h2>
          <p style="margin:0 0 8px;font-size:15px;line-height:22px;color:${MAIL_THEME.textSecondary};">
            ${escapeHtml(options.subtitle)}
          </p>
          ${options.meta ? `<p style="margin:0;font-size:14px;line-height:20px;color:${MAIL_THEME.textMuted};">${escapeHtml(options.meta)}</p>` : ''}
        </td>
      </tr>
    </table>
    ${renderDivider()}`;
}

export function renderOrderItemsTable(
  items: Array<{
    name: string;
    variationLabel?: string;
    quantity: number;
    subtotal: number;
    imageUrl?: string;
  }>,
): string {
  const rows = items
    .map((item) => {
      const imageCell = item.imageUrl
        ? `<td style="${cellBorder}padding:10px;text-align:center;">
            <img src="${escapeHtml(item.imageUrl)}" alt="" width="70" style="width:70px;height:auto;display:block;border:0;" />
          </td>`
        : '';

      const descriptionColspan = item.imageUrl ? '' : ' colspan="2"';

      return `
      <tr>
        ${imageCell}
        <td style="${cellBorder}padding:12px 15px;" valign="top"${descriptionColspan}>
          <p style="margin:0;text-align:left;font-weight:600;font-size:14px;line-height:20px;color:#444444;">
            ${escapeHtml(item.name)}
          </p>
          ${item.variationLabel ? `<p style="margin:8px 0 0;text-align:left;font-size:13px;line-height:18px;color:${MAIL_THEME.textMuted};">${escapeHtml(item.variationLabel)}</p>` : ''}
        </td>
        <td style="${cellBorder}padding:12px 15px;" valign="top">
          <p style="margin:0;text-align:left;font-size:14px;line-height:20px;color:#444444;">Cant.: <strong>${item.quantity}</strong></p>
        </td>
        <td style="${cellBorder}padding:12px 15px;" valign="top">
          <p style="margin:0;text-align:left;font-size:14px;line-height:20px;color:#444444;"><strong>${formatMoney(item.subtotal)}</strong></p>
        </td>
      </tr>`;
    })
    .join('');

  const productHeader = items.some((item) => item.imageUrl)
    ? `<th style="font-size:14px;padding:12px;text-align:center;${cellBorder}">Producto</th>`
    : '';

  return `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 8px;">
      <tr>
        ${productHeader}
        <th style="font-size:14px;padding:12px;text-align:center;${cellBorder}" colspan="${items.some((item) => item.imageUrl) ? '1' : '2'}">Descripción</th>
        <th style="font-size:14px;padding:12px;text-align:center;${cellBorder}">Cantidad</th>
        <th style="font-size:14px;padding:12px;text-align:center;${cellBorder}">Precio</th>
      </tr>
      ${rows}
    </table>`;
}

export function renderOrderTotalsTable(options: {
  subtotal: number;
  shippingTotal: number;
  shippingMethodTitle: string;
  couponDiscount?: number;
  total: number;
}): string {
  const rows = [
    { label: 'Productos', value: formatMoney(options.subtotal) },
    ...(options.couponDiscount && options.couponDiscount > 0
      ? [{ label: 'Descuento', value: `-${formatMoney(options.couponDiscount)}` }]
      : []),
    {
      label: `Envío${options.shippingMethodTitle ? ` (${options.shippingMethodTitle})` : ''}`,
      value: formatMoney(options.shippingTotal),
    },
    { label: 'Total pagado', value: formatMoney(options.total), strong: true },
  ];

  return `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
      ${rows
        .map(
          (row) => `
        <tr>
          <td style="${cellBorder}padding:12px 16px;font-size:13px;color:#000000;text-align:left;" colspan="2">
            ${escapeHtml(row.label)}:
          </td>
          <td style="${cellBorder}padding:12px 16px;font-size:13px;color:#000000;text-align:right;" colspan="2">
            ${row.strong ? `<strong>${row.value}</strong>` : `<strong>${row.value}</strong>`}
          </td>
        </tr>`,
        )
        .join('')}
    </table>`;
}

export function renderAddressBlock(title: string, address: Record<string, unknown>): string {
  return `
    <td style="width:50%;vertical-align:top;padding:0 8px 0 0;">
      <h5 style="margin:0 0 13px;padding-bottom:13px;border-bottom:1px solid #e6e8eb;font-size:16px;font-weight:600;color:#000000;text-align:left;text-transform:uppercase;">
        ${escapeHtml(title)}
      </h5>
      <p style="margin:0;text-align:left;font-size:14px;line-height:21px;color:#000000;">
        ${formatAddress(address as never)}
      </p>
    </td>`;
}

export function renderAddressSection(options: {
  shippingAddress: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
}): string {
  const billing = options.billingAddress ?? options.shippingAddress;

  return `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
      <tr>
        ${renderAddressBlock('Dirección de envío', options.shippingAddress)}
        <td style="width:16px;"></td>
        ${renderAddressBlock('Dirección de facturación', billing)}
      </tr>
    </table>`;
}

export function renderInfoRow(label: string, value: string): string {
  return `
    <p style="margin:0 0 10px;font-size:14px;line-height:20px;color:${MAIL_THEME.text};text-align:left;">
      <strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}
    </p>`;
}

export function renderStatusHighlight(statusLabel: string): string {
  return `
    <p style="margin:0 0 20px;padding:14px 16px;background:#fff7f2;border:1px solid #f3d5c3;border-radius:6px;font-size:15px;line-height:22px;color:${MAIL_THEME.text};text-align:center;">
      Estado actual: <strong style="color:${MAIL_THEME.primary};">${escapeHtml(statusLabel)}</strong>
    </p>`;
}
