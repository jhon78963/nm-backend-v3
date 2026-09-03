export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatMoney(amount: number): string {
  return `S/ ${amount.toFixed(2)}`;
}

export function formatAddress(address: {
  firstName?: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
}): string {
  const lines = [
    [address.firstName, address.lastName].filter(Boolean).join(' '),
    address.address1,
    address.address2,
    [address.city, address.state, address.postcode].filter(Boolean).join(', '),
    address.country,
    address.phone ? `Tel: ${address.phone}` : undefined,
  ].filter(Boolean);

  return lines.map((line) => escapeHtml(String(line))).join('<br>');
}

export function renderLayout(options: {
  title: string;
  preview?: string;
  body: string;
  storeUrl: string;
  storeName: string;
}): string {
  const { title, preview, body, storeUrl, storeName } = options;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  ${preview ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preview)}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="padding:24px 28px;background:#111827;color:#ffffff;">
              <a href="${escapeHtml(storeUrl)}" style="color:#ffffff;text-decoration:none;font-size:20px;font-weight:bold;">
                ${escapeHtml(storeName)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;line-height:1.6;">
              Este correo fue enviado por ${escapeHtml(storeName)}.<br />
              Si no solicitaste esta notificación, puedes ignorar este mensaje.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderButton(href: string, label: string): string {
  return `<p style="margin:24px 0;">
    <a href="${escapeHtml(href)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">
      ${escapeHtml(label)}
    </a>
  </p>`;
}
