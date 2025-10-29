import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { connectToMongo, User, Template, Workflow } from './mongodb';
import * as schema from '../shared/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool, { schema });

async function migrateToMongo() {
  try {
    // Connect to MongoDB
    await connectToMongo();
    
    // Migrate users
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
    console.log(`Migrated ${users.length} users`);

    // Migrate templates
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
    console.log(`Migrated ${templates.length} templates`);

    // Migrate workflows
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
    console.log(`Migrated ${workflows.length} workflows`);

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateToMongo();