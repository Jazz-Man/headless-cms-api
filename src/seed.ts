import * as bcrypt from 'bcrypt'
import { DataSource } from 'typeorm'
import { ContentType } from './entities/content-type.entity'
import { Taxonomy, TaxonomyType } from './entities/taxonomy.entity'
import { User, UserRole } from './entities/user.entity'

async function seed() {
  const dataSource = new DataSource({
    database: process.env.DB_DATABASE ?? 'headless_cms',
    entities: [User, ContentType, Taxonomy],
    host: process.env.DB_HOST ?? 'localhost',
    password: process.env.DB_PASSWORD ?? 'postgres',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    synchronize: true,
    type: 'postgres',
    username: process.env.DB_USERNAME ?? 'postgres',
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
      displayName: 'Admin',
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      role: UserRole.ADMIN,
    })
  }

  // Editor user
  const editorExists = await userRepo.findOne({
    where: { email: 'editor@example.com' },
  })
  if (!editorExists) {
    await userRepo.save({
      displayName: 'Editor',
      email: 'editor@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      role: UserRole.EDITOR,
    })
  }

  // Built-in content types
  const postType = await ctRepo.findOne({ where: { slug: 'post' } })
  if (!postType) {
    await ctRepo.save({
      isBuiltin: true,
      name: 'Post',
      schemaJsonb: {},
      slug: 'post',
    })
  }

  const pageType = await ctRepo.findOne({ where: { slug: 'page' } })
  if (!pageType) {
    await ctRepo.save({
      isBuiltin: true,
      name: 'Page',
      schemaJsonb: {},
      slug: 'page',
    })
  }

  // Built-in taxonomies
  const catTax = await taxRepo.findOne({ where: { slug: 'category' } })
  if (!catTax) {
    await taxRepo.save({
      isBuiltin: true,
      name: 'Categories',
      slug: 'category',
      type: TaxonomyType.HIERARCHICAL,
    })
  }

  const tagTax = await taxRepo.findOne({ where: { slug: 'post_tag' } })
  if (!tagTax) {
    await taxRepo.save({
      isBuiltin: true,
      name: 'Tags',
      slug: 'post_tag',
      type: TaxonomyType.FLAT,
    })
  }

  await dataSource.destroy()
  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
