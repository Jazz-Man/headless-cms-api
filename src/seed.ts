import { DataSource } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User, UserRole } from './entities/user.entity'
import { ContentType } from './entities/content-type.entity'
import { Taxonomy, TaxonomyType } from './entities/taxonomy.entity'

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'headless_cms',
    entities: [User, ContentType, Taxonomy],
    synchronize: true,
  })

  await dataSource.initialize()
  console.log('Seeding database...')

  const userRepo = dataSource.getRepository(User)
  const ctRepo = dataSource.getRepository(ContentType)
  const taxRepo = dataSource.getRepository(Taxonomy)

  // Admin user
  const adminExists = await userRepo.findOne({
    where: { email: 'admin@example.com' },
  })
  if (!adminExists) {
    await userRepo.save({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      displayName: 'Admin',
      role: UserRole.ADMIN,
    })
  }

  // Editor user
  const editorExists = await userRepo.findOne({
    where: { email: 'editor@example.com' },
  })
  if (!editorExists) {
    await userRepo.save({
      email: 'editor@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      displayName: 'Editor',
      role: UserRole.EDITOR,
    })
  }

  // Built-in content types
  const postType = await ctRepo.findOne({ where: { slug: 'post' } })
  if (!postType) {
    await ctRepo.save({ name: 'Post', slug: 'post', isBuiltin: true, schemaJsonb: {} })
  }

  const pageType = await ctRepo.findOne({ where: { slug: 'page' } })
  if (!pageType) {
    await ctRepo.save({ name: 'Page', slug: 'page', isBuiltin: true, schemaJsonb: {} })
  }

  // Built-in taxonomies
  const catTax = await taxRepo.findOne({ where: { slug: 'category' } })
  if (!catTax) {
    await taxRepo.save({
      name: 'Categories',
      slug: 'category',
      type: TaxonomyType.HIERARCHICAL,
      isBuiltin: true,
    })
  }

  const tagTax = await taxRepo.findOne({ where: { slug: 'post_tag' } })
  if (!tagTax) {
    await taxRepo.save({
      name: 'Tags',
      slug: 'post_tag',
      type: TaxonomyType.FLAT,
      isBuiltin: true,
    })
  }

  await dataSource.destroy()
  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
