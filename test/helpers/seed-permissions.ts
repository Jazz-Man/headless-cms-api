import { DataSource } from 'typeorm'

export const ALL_PERMISSIONS = [
  'content:create',
  'content:edit',
  'content:delete',
  'content:publish',
  'content-types:manage',
  'terms:manage',
  'menus:manage',
  'media:upload',
  'media:delete',
  'seo:manage',
  'webhooks:manage',
  'bulk:operate',
  'revisions:restore',
  'roles:manage',
]

const EDITOR_PERMISSIONS = [
  'content:create',
  'content:edit',
  'content:delete',
  'content:publish',
  'terms:manage',
  'media:upload',
  'seo:manage',
  'bulk:operate',
  'revisions:restore',
]

export async function seedPermissions(dataSource: DataSource): Promise<void> {
  const permRepo = dataSource.getRepository('permissions')
  const roleRepo = dataSource.getRepository('roles')

  // Create all permissions
  const permissionIds: Record<string, string> = {}
  for (const name of ALL_PERMISSIONS) {
    let perm = await permRepo.findOne({ where: { name } })
    if (!perm) {
      perm = await permRepo.save(
        permRepo.create({ description: `${name} permission`, name }),
      )
    }
    permissionIds[name] = perm.id
  }

  // Create admin role with all permissions
  let adminRole = await roleRepo.findOne({ where: { name: 'admin' } })
  if (!adminRole) {
    adminRole = await roleRepo.save(
      roleRepo.create({ isBuiltin: true, name: 'admin' }),
    )
  }
  await dataSource.query(`DELETE FROM role_permissions WHERE role_id = $1`, [
    adminRole.id,
  ])
  for (const permId of Object.values(permissionIds)) {
    await dataSource.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [adminRole.id, permId],
    )
  }

  // Create editor role
  let editorRole = await roleRepo.findOne({ where: { name: 'editor' } })
  if (!editorRole) {
    editorRole = await roleRepo.save(
      roleRepo.create({ isBuiltin: true, name: 'editor' }),
    )
  }
  await dataSource.query(`DELETE FROM role_permissions WHERE role_id = $1`, [
    editorRole.id,
  ])
  for (const name of EDITOR_PERMISSIONS) {
    const permId = permissionIds[name]
    if (permId) {
      await dataSource.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [editorRole.id, permId],
      )
    }
  }

  // Create viewer role (no permissions)
  const viewerExists = await roleRepo.findOne({ where: { name: 'viewer' } })
  if (!viewerExists) {
    await roleRepo.save(roleRepo.create({ isBuiltin: true, name: 'viewer' }))
  }
}
