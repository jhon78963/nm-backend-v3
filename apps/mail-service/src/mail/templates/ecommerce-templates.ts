import { EcommerceMailTemplate } from '@app/mail-client';

import { formatAddress, formatMoney, renderButton, renderLayout } from './layout';

type TemplateContext = {
  storeName: string;
  storeUrl: string;
};

export function buildMailContent(
  template: EcommerceMailTemplate,
  data: Record<string, unknown>,
  ctx: TemplateContext,
): { subject: string; html: string; text: string } {
  switch (template) {
    case EcommerceMailTemplate.CUSTOMER_WELCOME:
      return welcomeEmail(data, ctx);
    case EcommerceMailTemplate.CUSTOMER_PASSWORD_RESET:
      return passwordResetEmail(data, ctx);
    case EcommerceMailTemplate.ORDER_CONFIRMATION:
      return orderConfirmationEmail(data, ctx);
    case EcommerceMailTemplate.ORDER_STATUS_UPDATE:
      return orderStatusUpdateEmail(data, ctx);
    case EcommerceMailTemplate.ORDER_DELIVERED:
      return orderDeliveredEmail(data, ctx);
    case EcommerceMailTemplate.ORDER_CANCELLED:
      return orderCancelledEmail(data, ctx);
    case EcommerceMailTemplate.REFUND_STATUS_UPDATE:
      return refundStatusUpdateEmail(data, ctx);
    case EcommerceMailTemplate.REVIEW_APPROVED:
      return reviewApprovedEmail(data, ctx);
    case EcommerceMailTemplate.REVIEW_REJECTED:
      return reviewRejectedEmail(data, ctx);
    case EcommerceMailTemplate.ORDER_PAYMENT_RECEIVED:
      return orderPaymentReceivedEmail(data, ctx);
    default:
      throw new Error(`Plantilla no soportada: ${template}`);
  }
}

function welcomeEmail(data: Record<string, unknown>, ctx: TemplateContext) {
  const customerName = String(data.customerName ?? 'Cliente');
  const storeUrl = String(data.storeUrl ?? ctx.storeUrl);
  const subject = `¡Bienvenido/a a ${ctx.storeName}!`;
  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;">¡Hola, ${customerName}!</h1>
    <p style="line-height:1.6;margin:0 0 16px;">
      Gracias por registrarte en ${ctx.storeName}. Tu cuenta ya está lista para que explores nuestro catálogo,
      guardes tus favoritos y realices pedidos con más rapidez.
    </p>
    ${renderButton(storeUrl, 'Ir a la tienda')}
  `;

  return {
    subject,
    html: renderLayout({ title: subject, preview: subject, body, storeUrl, storeName: ctx.storeName }),
    text: `Hola ${customerName}, gracias por registrarte en ${ctx.storeName}. Visita: ${storeUrl}`,
  };
}

function passwordResetEmail(data: Record<string, unknown>, ctx: TemplateContext) {
  const customerName = data.customerName ? String(data.customerName) : 'Cliente';
  const resetUrl = String(data.resetUrl);
  const expiresInMinutes = Number(data.expiresInMinutes ?? 60);
  const subject = 'Restablece tu contraseña';
  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;">Restablecer contraseña</h1>
    <p style="line-height:1.6;margin:0 0 16px;">
      Hola ${customerName}, recibimos una solicitud para restablecer tu contraseña.
      El enlace expira en ${expiresInMinutes} minutos.
    </p>
    ${renderButton(resetUrl, 'Restablecer contraseña')}
    <p style="line-height:1.6;margin:16px 0 0;font-size:14px;color:#71717a;">
      Si no solicitaste este cambio, ignora este correo.
    </p>
  `;

  return {
    subject,
    html: renderLayout({ title: subject, preview: subject, body, storeUrl: ctx.storeUrl, storeName: ctx.storeName }),
    text: `Restablece tu contraseña: ${resetUrl}`,
  };
}

function orderConfirmationEmail(data: Record<string, unknown>, ctx: TemplateContext) {
  const customerName = String(data.customerName ?? 'Cliente');
  const orderNumber = String(data.orderNumber);
  const items = (data.items as Array<Record<string, unknown>>) ?? [];
  const subtotal = Number(data.subtotal ?? 0);
  const shippingTotal = Number(data.shippingTotal ?? 0);
  const couponDiscount = Number(data.couponDiscount ?? 0);
  const total = Number(data.total ?? 0);
  const shippingMethodTitle = String(data.shippingMethodTitle ?? '');
  const paymentMethodTitle = String(data.paymentMethodTitle ?? '');
  const shippingAddress = (data.shippingAddress as Record<string, unknown>) ?? {};
  const trackUrl = String(data.trackUrl);
  const storeUrl = String(data.storeUrl ?? ctx.storeUrl);

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
          <strong>${String(item.name)}</strong>
          ${item.variationLabel ? `<br><span style="color:#71717a;font-size:13px;">${String(item.variationLabel)}</span>` : ''}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;text-align:center;">${Number(item.quantity)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;text-align:right;">${formatMoney(Number(item.subtotal))}</td>
      </tr>`,
    )
    .join('');

  const subject = `Pedido confirmado — ${orderNumber}`;
  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;">¡Gracias por tu compra!</h1>
    <p style="line-height:1.6;margin:0 0 20px;">Hola ${customerName}, recibimos tu pedido <strong>${orderNumber}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
      <tr>
        <th align="left" style="padding:8px 0;border-bottom:2px solid #e4e4e7;">Producto</th>
        <th style="padding:8px 0;border-bottom:2px solid #e4e4e7;">Cant.</th>
        <th align="right" style="padding:8px 0;border-bottom:2px solid #e4e4e7;">Subtotal</th>
      </tr>
      ${itemsHtml}
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
      <tr><td>Subtotal</td><td align="right">${formatMoney(subtotal)}</td></tr>
      <tr><td>Envío (${shippingMethodTitle})</td><td align="right">${formatMoney(shippingTotal)}</td></tr>
      ${couponDiscount > 0 ? `<tr><td>Descuento</td><td align="right">-${formatMoney(couponDiscount)}</td></tr>` : ''}
      <tr><td><strong>Total</strong></td><td align="right"><strong>${formatMoney(total)}</strong></td></tr>
    </table>
    <p style="margin:0 0 8px;"><strong>Método de pago:</strong> ${paymentMethodTitle}</p>
    <p style="margin:0 0 20px;"><strong>Envío a:</strong><br>${formatAddress(shippingAddress as never)}</p>
    ${renderButton(trackUrl, 'Seguir mi pedido')}
  `;

  return {
    subject,
    html: renderLayout({ title: subject, preview: `Tu pedido ${orderNumber} fue registrado`, body, storeUrl, storeName: ctx.storeName }),
    text: `Pedido ${orderNumber} confirmado. Total: ${formatMoney(total)}. Seguimiento: ${trackUrl}`,
  };
}

function orderStatusUpdateEmail(data: Record<string, unknown>, ctx: TemplateContext) {
  const customerName = String(data.customerName ?? 'Cliente');
  const orderNumber = String(data.orderNumber);
  const statusLabel = String(data.statusLabel ?? data.status ?? '');
  const trackingNumber = data.trackingNumber ? String(data.trackingNumber) : undefined;
  const trackingUrl = data.trackingUrl ? String(data.trackingUrl) : undefined;
  const trackUrl = String(data.trackUrl);
  const storeUrl = String(data.storeUrl ?? ctx.storeUrl);

  const subject = `Actualización de pedido ${orderNumber}`;
  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;">Tu pedido fue actualizado</h1>
    <p style="line-height:1.6;margin:0 0 16px;">
      Hola ${customerName}, el estado de tu pedido <strong>${orderNumber}</strong> ahora es:
      <strong>${statusLabel}</strong>.
    </p>
    ${trackingNumber ? `<p style="margin:0 0 8px;"><strong>Guía de seguimiento:</strong> ${trackingNumber}</p>` : ''}
    ${trackingUrl ? renderButton(trackingUrl, 'Rastrear envío') : ''}
    ${renderButton(trackUrl, 'Ver detalle del pedido')}
  `;

  return {
    subject,
    html: renderLayout({ title: subject, preview: `Estado: ${statusLabel}`, body, storeUrl, storeName: ctx.storeName }),
    text: `Pedido ${orderNumber} — ${statusLabel}. ${trackUrl}`,
  };
}

function orderDeliveredEmail(data: Record<string, unknown>, ctx: TemplateContext) {
  const customerName = String(data.customerName ?? 'Cliente');
  const orderNumber = String(data.orderNumber);
  const reviewUrl = String(data.reviewUrl);
  const storeUrl = String(data.storeUrl ?? ctx.storeUrl);
  const subject = `¡Tu pedido ${orderNumber} fue entregado!`;

  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;">Pedido entregado</h1>
    <p style="line-height:1.6;margin:0 0 16px;">
      Hola ${customerName}, confirmamos la entrega de tu pedido <strong>${orderNumber}</strong>.
      Esperamos que disfrutes tu compra.
    </p>
    ${renderButton(reviewUrl, 'Dejar una reseña')}
  `;

  return {
    subject,
    html: renderLayout({ title: subject, preview: subject, body, storeUrl, storeName: ctx.storeName }),
    text: `Pedido ${orderNumber} entregado. Reseña: ${reviewUrl}`,
  };
}

function orderCancelledEmail(data: Record<string, unknown>, ctx: TemplateContext) {
  const customerName = String(data.customerName ?? 'Cliente');
  const orderNumber = String(data.orderNumber);
  const reason = data.reason ? String(data.reason) : undefined;
  const storeUrl = String(data.storeUrl ?? ctx.storeUrl);
  const subject = `Pedido ${orderNumber} cancelado`;

  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;">Pedido cancelado</h1>
    <p style="line-height:1.6;margin:0 0 16px;">
      Hola ${customerName}, tu pedido <strong>${orderNumber}</strong> fue cancelado.
    </p>
    ${reason ? `<p style="line-height:1.6;margin:0 0 16px;color:#71717a;">Motivo: ${reason}</p>` : ''}
    ${renderButton(storeUrl, 'Volver a la tienda')}
  `;

  return {
    subject,
    html: renderLayout({ title: subject, preview: subject, body, storeUrl, storeName: ctx.storeName }),
    text: `Pedido ${orderNumber} cancelado.`,
  };
}

function refundStatusUpdateEmail(data: Record<string, unknown>, ctx: TemplateContext) {
  const customerName = String(data.customerName ?? 'Cliente');
  const orderNumber = String(data.orderNumber);
  const statusLabel = String(data.statusLabel ?? data.status ?? '');
  const amount = data.amount !== undefined ? Number(data.amount) : undefined;
  const adminNotes = data.adminNotes ? String(data.adminNotes) : undefined;
  const storeUrl = String(data.storeUrl ?? ctx.storeUrl);
  const subject = `Actualización de reembolso — ${orderNumber}`;

  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;">Estado de tu reembolso</h1>
    <p style="line-height:1.6;margin:0 0 16px;">
      Hola ${customerName}, el reembolso de tu pedido <strong>${orderNumber}</strong> está en estado:
      <strong>${statusLabel}</strong>.
    </p>
    ${amount !== undefined ? `<p style="margin:0 0 8px;"><strong>Monto:</strong> ${formatMoney(amount)}</p>` : ''}
    ${adminNotes ? `<p style="line-height:1.6;margin:0 0 16px;color:#71717a;">${adminNotes}</p>` : ''}
    ${renderButton(storeUrl, 'Ir a la tienda')}
  `;

  return {
    subject,
    html: renderLayout({ title: subject, preview: subject, body, storeUrl, storeName: ctx.storeName }),
    text: `Reembolso ${orderNumber}: ${statusLabel}`,
  };
}

function reviewApprovedEmail(data: Record<string, unknown>, ctx: TemplateContext) {
  const customerName = String(data.customerName ?? 'Cliente');
  const productName = String(data.productName);
  const productUrl = String(data.productUrl);
  const storeUrl = String(data.storeUrl ?? ctx.storeUrl);
  const subject = 'Tu reseña fue publicada';

  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;">¡Gracias por tu opinión!</h1>
    <p style="line-height:1.6;margin:0 0 16px;">
      Hola ${customerName}, tu reseña sobre <strong>${productName}</strong> ya está visible en la tienda.
    </p>
    ${renderButton(productUrl, 'Ver producto')}
  `;

  return {
    subject,
    html: renderLayout({ title: subject, preview: subject, body, storeUrl, storeName: ctx.storeName }),
    text: `Tu reseña de ${productName} fue publicada.`,
  };
}

function reviewRejectedEmail(data: Record<string, unknown>, ctx: TemplateContext) {
  const customerName = String(data.customerName ?? 'Cliente');
  const productName = String(data.productName);
  const reason = data.reason ? String(data.reason) : undefined;
  const storeUrl = String(data.storeUrl ?? ctx.storeUrl);
  const subject = 'Actualización sobre tu reseña';

  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;">Reseña no publicada</h1>
    <p style="line-height:1.6;margin:0 0 16px;">
      Hola ${customerName}, no pudimos publicar tu reseña sobre <strong>${productName}</strong>.
    </p>
    ${reason ? `<p style="line-height:1.6;margin:0 0 16px;color:#71717a;">Motivo: ${reason}</p>` : ''}
    ${renderButton(storeUrl, 'Volver a la tienda')}
  `;

  return {
    subject,
    html: renderLayout({ title: subject, preview: subject, body, storeUrl, storeName: ctx.storeName }),
    text: `Reseña de ${productName} no publicada.`,
  };
}

function orderPaymentReceivedEmail(data: Record<string, unknown>, ctx: TemplateContext) {
  const customerName = String(data.customerName ?? 'Cliente');
  const orderNumber = String(data.orderNumber);
  const total = Number(data.total ?? 0);
  const trackUrl = String(data.trackUrl);
  const storeUrl = String(data.storeUrl ?? ctx.storeUrl);
  const subject = `Pago confirmado — ${orderNumber}`;

  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;">Pago recibido</h1>
    <p style="line-height:1.6;margin:0 0 16px;">
      Hola ${customerName}, confirmamos el pago de tu pedido <strong>${orderNumber}</strong>
      por <strong>${formatMoney(total)}</strong>.
    </p>
    ${renderButton(trackUrl, 'Ver mi pedido')}
  `;

  return {
    subject,
    html: renderLayout({ title: subject, preview: subject, body, storeUrl, storeName: ctx.storeName }),
    text: `Pago confirmado para pedido ${orderNumber}.`,
  };
}
