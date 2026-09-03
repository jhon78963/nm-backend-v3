-- Rol Cliente y permisos ecommerce para compradores de nm-ecommerce (auth-service RBAC).

INSERT INTO permissions (id, name, guard_name)
SELECT gen_random_uuid(), perm_name, 'api'
FROM (
  VALUES
    ('ecommerce.customer.read'),
    ('ecommerce.customer.update'),
    ('ecommerce.customer.password.change'),
    ('ecommerce.review.read'),
    ('ecommerce.review.create'),
    ('ecommerce.order.create'),
    ('ecommerce.order.read.own'),
    ('ecommerce.order.track'),
    ('ecommerce.wishlist.manage'),
    ('ecommerce.address.read'),
    ('ecommerce.address.manage'),
    ('ecommerce.review.index'),
    ('ecommerce.review.moderate'),
    ('ecommerce.order.admin.read'),
    ('ecommerce.order.admin.update'),
    ('ecommerce.customer.admin.read')
) AS t(perm_name)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p WHERE p.name = t.perm_name
);

INSERT INTO roles (id, name, guard_name, tenant_id, is_system)
SELECT gen_random_uuid(), 'Cliente', 'api', NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM roles r WHERE r.name = 'Cliente' AND r.tenant_id IS NULL
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'ecommerce.customer.read',
  'ecommerce.customer.update',
  'ecommerce.customer.password.change',
  'ecommerce.review.read',
  'ecommerce.review.create',
  'ecommerce.order.create',
  'ecommerce.order.read.own',
  'ecommerce.order.track',
  'ecommerce.wishlist.manage',
  'ecommerce.address.read',
  'ecommerce.address.manage'
)
WHERE r.name = 'Cliente'
  AND r.tenant_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions existing
    WHERE existing.role_id = r.id
      AND existing.permission_id = p.id
  );

-- Permisos admin ecommerce para el rol Admin del tenant (moderación, pedidos, clientes web).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'ecommerce.review.index',
  'ecommerce.review.moderate',
  'ecommerce.order.admin.read',
  'ecommerce.order.admin.update',
  'ecommerce.customer.admin.read'
)
WHERE r.name = 'Admin'
  AND r.tenant_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions existing
    WHERE existing.role_id = r.id
      AND existing.permission_id = p.id
  );
