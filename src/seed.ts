import * as bcrypt from 'bcrypt'
import { DataSource } from 'typeorm'

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
