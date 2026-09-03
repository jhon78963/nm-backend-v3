import type { ToolDefinition } from '../../../application/ports/ai-provider.port.js';

export const TOOL_NAMES = {
  OBTENER_PRECIO_PRODUCTO: 'obtener_precio_producto',
  OBTENER_INFORMACION_PRODUCTO: 'obtener_informacion_producto',
  BUSCAR_PRODUCTOS: 'buscar_productos',
} as const;

const NOMBRE_PRODUCTO_PARAM = {
  type: 'object',
  properties: {
    nombre_producto: {
      type: 'string',
      description:
        'Nombre o descripción del producto tal como lo menciona el cliente, ' +
        'por ejemplo "polo azul" o "vestido floral". No es necesario que sea exacto.',
    },
    categoria: {
      type: 'string',
      description: 'Categoría opcional: niño, joven, señorita, adulto mayor.',
    },
  },
  required: ['nombre_producto'],
} as const;

export const OBTENER_PRECIO_PRODUCTO_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: TOOL_NAMES.OBTENER_PRECIO_PRODUCTO,
    description:
      'Consulta en el catálogo de Maritex el precio vigente de un producto (tallas, colores y stock disponible). ' +
      'Usa esta herramienta SIEMPRE que el cliente pregunte precio, costo o cuánto cuesta un producto específico. ' +
      'Nunca inventes un precio sin llamar a esta herramienta.',
    parameters: NOMBRE_PRODUCTO_PARAM,
  },
};

export const OBTENER_INFORMACION_PRODUCTO_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: TOOL_NAMES.OBTENER_INFORMACION_PRODUCTO,
    description:
      'Consulta información detallada de un producto: descripción, categoría, tallas, colores, stock y enlace a la tienda. ' +
      'Usa esta herramienta cuando el cliente pregunte por detalles, disponibilidad o características de un producto.',
    parameters: NOMBRE_PRODUCTO_PARAM,
  },
};

export const BUSCAR_PRODUCTOS_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: TOOL_NAMES.BUSCAR_PRODUCTOS,
    description:
      'Busca productos en el catálogo de Maritex por nombre o categoría. ' +
      'Usa cuando el cliente pide opciones, modelos o recomendaciones de una prenda.',
    parameters: NOMBRE_PRODUCTO_PARAM,
  },
};

export const PRODUCT_TOOLS: ToolDefinition[] = [
  OBTENER_PRECIO_PRODUCTO_TOOL,
  OBTENER_INFORMACION_PRODUCTO_TOOL,
  BUSCAR_PRODUCTOS_TOOL,
];
