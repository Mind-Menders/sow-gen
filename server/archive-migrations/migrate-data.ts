import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { connectToMongo, User, Template, Workflow } from '../mongodb';
import * as schema from '../../shared/schema';

async function migrateData() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'sow_gen_db',
    user: 'postgres',
    password: 'admin'
  });

  try {
    console.log('Connecting to MongoDB...');
    await connectToMongo();
    
    console.log('Connecting to PostgreSQL...');
    const db = drizzle(pool, { schema });

    // Migrate users
    console.log('Migrating users...');
    const users = await db.select().from(schema.users);
    for (const user of users) {
      await User.create({
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    }
    console.log(`✓ Migrated ${users.length} users`);

    // Migrate templates
    console.log('Migrating templates...');
    const templates = await db.select().from(schema.templates);
    for (const template of templates) {
      const user = await User.findOne({ email: template.userId });
      if (user) {
        await Template.create({
          userId: user._id,
          name: template.name,
          description: template.description,
          sowType: template.sowType,
          isOfficial: template.isOfficial,
          sections: template.sections,
          createdAt: template.createdAt
        });
      }
    }
    console.log(`✓ Migrated ${templates.length} templates`);

    // Migrate workflows
    console.log('Migrating workflows...');
    const workflows = await db.select().from(schema.workflows);
    for (const workflow of workflows) {
      const user = await User.findOne({ email: workflow.userId });
      if (user) {
        await Workflow.create({
          userId: user._id,
          name: workflow.name,
          description: workflow.description,
          sowTypes: workflow.sowTypes,
          stages: workflow.stages,
          isActive: workflow.isActive,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt
        });
      }
    }
    console.log(`✓ Migrated ${workflows.length} workflows`);

    console.log('Migration completed successfully! 🎉');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

migrateData();