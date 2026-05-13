import * as bcrypt from 'bcrypt'
import { DataSource } from 'typeorm'

const ALL_PERMISSIONS = [
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

async function seed() {
  const dataSource = new DataSource({
    database: process.env.DB_DATABASE ?? 'headless_cms',
    entities: ['dist/entities/*.entity.js'],
    host: process.env.DB_HOST ?? 'localhost',
    password: process.env.DB_PASSWORD ?? 'postgres',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    synchronize: true,
    type: 'postgres',
    username: process.env.DB_USERNAME ?? 'postgres',
  })

  await dataSource.initialize()
  console.log('Seeding database...')

  const userRepo = dataSource.getRepository('users')
  const ctRepo = dataSource.getRepository('content_types')
  const taxRepo = dataSource.getRepository('taxonomies')
  const permRepo = dataSource.getRepository('permissions')
  const roleRepo = dataSource.getRepository('roles')

  // Seed permissions
  const permissions: Record<string, string> = {}
  for (const name of ALL_PERMISSIONS) {
    let perm = await permRepo.findOne({ where: { name } })
    if (!perm) {
      perm = await permRepo.save(
        permRepo.create({ description: `${name} permission`, name }),
      )
    }
    permissions[name] = perm.id
  }

  // Seed admin role with ALL permissions
  let adminRole = await roleRepo.findOne({
    where: { name: 'admin' },
  })
  if (!adminRole) {
    adminRole = await roleRepo.save(
      roleRepo.create({ isBuiltin: true, name: 'admin' }),
    )
  }
  // Clear and re-assign all permissions
  await dataSource.query(`DELETE FROM role_permissions WHERE role_id = $1`, [
    adminRole.id,
  ])
  for (const permId of Object.values(permissions)) {
    await dataSource.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [adminRole.id, permId],
    )
  }

  // Seed editor role
  let editorRole = await roleRepo.findOne({
    where: { name: 'editor' },
  })
  if (!editorRole) {
    editorRole = await roleRepo.save(
      roleRepo.create({ isBuiltin: true, name: 'editor' }),
    )
  }
  await dataSource.query(`DELETE FROM role_permissions WHERE role_id = $1`, [
    editorRole.id,
  ])
  for (const name of EDITOR_PERMISSIONS) {
    const permId = permissions[name]
    if (permId) {
      await dataSource.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [editorRole.id, permId],
      )
    }
  }

  // Seed viewer role (no permissions)
  const viewerExists = await roleRepo.findOne({ where: { name: 'viewer' } })
  if (!viewerExists) {
    await roleRepo.save(roleRepo.create({ isBuiltin: true, name: 'viewer' }))
  }

  // Admin user
  const adminExists = await userRepo.findOne({
    where: { email: 'admin@example.com' },
  })
  if (!adminExists) {
    await userRepo.save(
      userRepo.create({
        displayName: 'Admin',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'admin',
      }),
    )
  }

  // Editor user
  const editorExists = await userRepo.findOne({
    where: { email: 'editor@example.com' },
  })
  if (!editorExists) {
    await userRepo.save(
      userRepo.create({
        displayName: 'Editor',
        email: 'editor@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'editor',
      }),
    )
  }

  // Built-in content types
  const postType = await ctRepo.findOne({ where: { slug: 'post' } })
  if (!postType) {
    await ctRepo.save(
      ctRepo.create({
        isBuiltin: true,
        name: 'Post',
        schemaJsonb: {},
        slug: 'post',
      }),
    )
  }

  const pageType = await ctRepo.findOne({ where: { slug: 'page' } })
  if (!pageType) {
    await ctRepo.save(
      ctRepo.create({
        isBuiltin: true,
        name: 'Page',
        schemaJsonb: {},
        slug: 'page',
      }),
    )
  }

  // Built-in taxonomies
  const catTax = await taxRepo.findOne({ where: { slug: 'category' } })
  if (!catTax) {
    await taxRepo.save(
      taxRepo.create({
        isBuiltin: true,
        name: 'Categories',
        slug: 'category',
        type: 'hierarchical',
      }),
    )
  }

  const tagTax = await taxRepo.findOne({ where: { slug: 'post_tag' } })
  if (!tagTax) {
    await taxRepo.save(
      taxRepo.create({
        isBuiltin: true,
        name: 'Tags',
        slug: 'post_tag',
        type: 'flat',
      }),
    )
  }

  await dataSource.destroy()
  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
