-- Add report.sales permission (missing from initial migration) and grant to roles with report.index
INSERT INTO permissions (id, name, guard_name)
SELECT gen_random_uuid(), 'report.sales', 'api'
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE name = 'report.sales'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p_report ON p_report.name = 'report.index'
JOIN role_permissions rp ON rp.role_id = r.id AND rp.permission_id = p_report.id
JOIN permissions p ON p.name = 'report.sales'
WHERE NOT EXISTS (
  SELECT 1
  FROM role_permissions existing
  WHERE existing.role_id = r.id AND existing.permission_id = p.id
);
