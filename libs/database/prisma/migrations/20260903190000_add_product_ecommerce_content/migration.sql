-- Contenido de tienda online para productos (descripciones, etiquetas)
ALTER TABLE "products" ADD COLUMN "short_description" TEXT;
ALTER TABLE "products" ADD COLUMN "additional_info" TEXT;
ALTER TABLE "products" ADD COLUMN "is_new" BOOLEAN NOT NULL DEFAULT false;
