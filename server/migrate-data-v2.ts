import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { connectToMongo, User, Template, Workflow } from './mongodb';
import * as schema from '../shared/schema';

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
      console.log(`Migrating user: ${user.email}`);
      const userData = {
        name: user.name || '',
        email: user.email || '',
        password: user.password || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        profileImageUrl: user.profileImageUrl || '',
        role: user.role || 'user',
        department: user.department || '',
        isActive: user.isActive !== undefined ? user.isActive : true,
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date()
      };
      await User.create(userData);
    }
    console.log(`✓ Migrated ${users.length} users`);

    // Migrate templates
    console.log('Migrating templates...');
    const templates = await db.select().from(schema.templates);
    for (const template of templates) {
      const templateData = {
        name: template.name,
        description: template.description,
        sowType: template.sowType,
        isOfficial: template.isOfficial,
        sections: template.sections,
        createdAt: template.createdAt
      };
      await Template.create(templateData);
    }
    console.log(`✓ Migrated ${templates.length} templates`);

    // Migrate workflows
    console.log('Migrating workflows...');
    const workflows = await db.select().from(schema.workflows);
    for (const workflow of workflows) {
      const workflowData = {
        name: workflow.name,
        description: workflow.description,
        sowTypes: workflow.sowTypes,
        stages: workflow.stages,
        isActive: workflow.isActive,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt
      };
      await Workflow.create(workflowData);
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