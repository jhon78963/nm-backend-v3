/** Paleta y tipografía basadas en los templates Multikart de nm-email. */
export const MAIL_THEME = {
  fontFamily: "'Nunito Sans', Arial, Helvetica, sans-serif",
  background: '#e2e2e2',
  surface: '#ffffff',
  primary: '#ec8951',
  text: '#252525',
  textMuted: '#939393',
  textSecondary: '#707070',
  footerBg: '#212121',
  footerText: '#e4e4e4',
  border: '#e2e2e2',
  borderStrong: '#dddddd',
  maxWidth: 650,
} as const;

export type MailBranding = {
  storeName: string;
  storeUrl: string;
  logoUrl?: string;
  bannerUrl?: string;
  supportEmail?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    pinterest?: string;
  };
};

export type MailLayoutOptions = MailBranding & {
  title: string;
  preview?: string;
  body: string;
  bannerUrl?: string;
  footerVariant?: 'dark' | 'light';
  showNav?: boolean;
  showSupportBlock?: boolean;
};

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

function joinUrl(base: string, path: string): string {
  const normalizedBase = base.replace(/\/$/, '');
  return `${normalizedBase}${path}`;
}

function renderHeader(options: MailBranding & { showNav: boolean }): string {
  const { storeName, storeUrl, logoUrl, showNav } = options;
  const logoBlock = logoUrl
    ? `<a href="${escapeHtml(storeUrl)}" style="text-decoration:none;">
        <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(storeName)}" width="140" style="width:140px;height:auto;display:block;border:0;" />
      </a>`
    : `<a href="${escapeHtml(storeUrl)}" style="text-decoration:none;font-weight:800;font-size:20px;line-height:1.2;color:${MAIL_THEME.text};">
        ${escapeHtml(storeName)}
      </a>`;

  const navItems = [
    { label: 'Inicio', href: storeUrl },
    { label: 'Favoritos', href: joinUrl(storeUrl, '/favoritos') },
    { label: 'Carrito', href: joinUrl(storeUrl, '/carrito') },
    { label: 'Contacto', href: joinUrl(storeUrl, '/contactanos') },
  ];

  const navBlock = showNav
    ? `<td align="right" valign="middle" style="padding:16px 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="right">
          <tr>
            ${navItems
              .map(
                (item) => `
              <td style="padding-left:12px;">
                <a href="${escapeHtml(item.href)}" style="text-decoration:none;font-weight:700;font-size:14px;line-height:19px;color:${MAIL_THEME.text};text-transform:capitalize;">
                  ${escapeHtml(item.label)}
                </a>
              </td>`,
              )
              .join('')}
          </tr>
        </table>
      </td>`
    : '';

  return `
    <tr>
      <td style="background:${MAIL_THEME.surface};">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="left" valign="middle" style="padding:16px 24px;">
              ${logoBlock}
            </td>
            ${navBlock}
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderBanner(bannerUrl: string): string {
  return `
    <tr>
      <td style="background:${MAIL_THEME.surface};">
        <img src="${escapeHtml(bannerUrl)}" alt="" width="${MAIL_THEME.maxWidth}" style="width:100%;max-width:${MAIL_THEME.maxWidth}px;height:auto;display:block;border:0;margin:0;" />
      </td>
    </tr>`;
}

function renderDarkFooter(options: MailBranding): string {
  const { storeName, socialLinks = {} } = options;
  const socialItems = [
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'twitter', label: 'Twitter' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'pinterest', label: 'Pinterest' },
  ].filter((item) => socialLinks[item.key as keyof typeof socialLinks]);

  const socialBlock =
    socialItems.length > 0
      ? `<tr>
          <td align="center" style="padding-bottom:12px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
              <tr>
                ${socialItems
                  .map(
                    (item) => `
                  <td style="padding:0 8px;">
                    <a href="${escapeHtml(socialLinks[item.key as keyof typeof socialLinks]!)}" style="text-decoration:none;font-weight:700;font-size:12px;line-height:20px;color:${MAIL_THEME.primary};text-transform:uppercase;">
                      ${escapeHtml(item.label)}
                    </a>
                  </td>`,
                  )
                  .join('')}
              </tr>
            </table>
          </td>
        </tr>`
      : '';

  return `
    <tr>
      <td style="background:${MAIL_THEME.footerBg};padding:24px 20px;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          ${socialBlock}
          <tr>
            <td align="center" style="font-weight:800;font-size:11px;line-height:20px;letter-spacing:0.5px;color:${MAIL_THEME.footerText};text-transform:uppercase;">
              Este correo fue enviado por ${escapeHtml(storeName)}.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:12px;font-size:12px;line-height:20px;color:${MAIL_THEME.footerText};">
              Si no solicitaste esta notificación, puedes ignorar este mensaje.
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderLightFooter(options: MailBranding): string {
  const { storeName, socialLinks = {} } = options;
  const socialItems = [
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'twitter', label: 'Twitter' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'pinterest', label: 'Pinterest' },
  ].filter((item) => socialLinks[item.key as keyof typeof socialLinks]);

  const socialBlock =
    socialItems.length > 0
      ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:20px auto 0;">
          <tr>
            ${socialItems
              .map(
                (item) => `
              <td style="padding:0 6px;">
                <a href="${escapeHtml(socialLinks[item.key as keyof typeof socialLinks]!)}" style="text-decoration:none;font-size:13px;color:#444444;">
                  ${escapeHtml(item.label)}
                </a>
              </td>`,
              )
              .join('')}
          </tr>
        </table>`
      : '';

  return `
    <tr>
      <td style="background:#fafafa;padding:30px 24px;border-top:1px solid ${MAIL_THEME.borderStrong};">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <h4 style="margin:0;color:#444444;font-size:18px;font-weight:700;text-transform:uppercase;">
                Síguenos
              </h4>
              ${socialBlock}
              <div style="border-top:1px solid ${MAIL_THEME.borderStrong};margin:20px auto 0;"></div>
              <p style="margin:20px 0 0;font-size:13px;line-height:20px;color:#777777;">
                Este correo fue enviado por ${escapeHtml(storeName)}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function renderSupportBlock(supportEmail: string, storeUrl: string): string {
  const email = escapeHtml(supportEmail);
  const faqUrl = escapeHtml(joinUrl(storeUrl, '/preguntas-frecuentes'));

  return `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td align="center" style="padding:0 16px;">
          <p style="margin:0;font-weight:600;font-size:14px;line-height:22px;text-align:center;color:${MAIL_THEME.textMuted};">
            Si tienes alguna pregunta, escríbenos a
            <a href="mailto:${email}" style="font-weight:700;color:${MAIL_THEME.primary};text-decoration:underline;">${email}</a>
            o visita nuestras
            <a href="${faqUrl}" style="font-weight:700;color:${MAIL_THEME.primary};text-decoration:underline;">preguntas frecuentes</a>.
          </p>
        </td>
      </tr>
    </table>`;
}

export function renderHeading(title: string, options?: { centered?: boolean }): string {
  const align = options?.centered === false ? 'left' : 'center';

  return `
    <h1 style="margin:0 0 8px;font-weight:700;font-size:18px;line-height:24px;color:${MAIL_THEME.text};text-align:${align};">
      ${title}
    </h1>`;
}

export function renderParagraph(text: string, options?: { centered?: boolean; muted?: boolean }): string {
  const align = options?.centered === false ? 'left' : 'center';
  const color = options?.muted ? MAIL_THEME.textMuted : MAIL_THEME.textSecondary;

  return `
    <p style="margin:0 0 16px;font-weight:600;font-size:14px;line-height:22px;text-align:${align};color:${color};">
      ${text}
    </p>`;
}

export function renderDivider(): string {
  return `<div style="border-top:1px solid ${MAIL_THEME.borderStrong};height:1px;margin:24px 0;"></div>`;
}

export function renderButton(href: string, label: string): string {
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto;">
      <tr>
        <td align="center" style="border-radius:6px;background:${MAIL_THEME.primary};">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 28px;font-weight:700;font-size:16px;line-height:22px;color:#ffffff;text-decoration:none;border-radius:6px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

export function renderLayout(options: MailLayoutOptions): string {
  const {
    title,
    preview,
    body,
    storeUrl,
    storeName,
    logoUrl,
    bannerUrl,
    supportEmail,
    socialLinks,
    footerVariant = 'dark',
    showNav = true,
    showSupportBlock = true,
  } = options;

  const branding: MailBranding = {
    storeName,
    storeUrl,
    logoUrl,
    bannerUrl,
    supportEmail,
    socialLinks,
  };

  const supportBlock =
    showSupportBlock && supportEmail ? renderSupportBlock(supportEmail, storeUrl) : '';
  const footer =
    footerVariant === 'light' ? renderLightFooter(branding) : renderDarkFooter(branding);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:${MAIL_THEME.background};font-family:${MAIL_THEME.fontFamily};color:${MAIL_THEME.text};">
  ${preview ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preview)}</div>` : ''}
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${MAIL_THEME.background};padding:20px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:${MAIL_THEME.maxWidth}px;background:${MAIL_THEME.surface};border-collapse:collapse;">
          ${renderHeader({ ...branding, showNav })}
          ${bannerUrl ? renderBanner(bannerUrl) : ''}
          <tr>
            <td style="padding:24px 28px 8px;background:${MAIL_THEME.surface};">
              ${body}
              ${supportBlock}
            </td>
          </tr>
          ${footer}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
