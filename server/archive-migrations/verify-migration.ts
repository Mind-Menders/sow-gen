import { connectToMongo, User, Template, Workflow } from './mongodb-migration';

async function verifyMigration() {
  try {
    await connectToMongo();

    // Check users
    const users = await User.find();
    console.log('\nUsers:', users.length);
    users.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });

    // Check templates
    const templates = await Template.find();
    console.log('\nTemplates:', templates.length);
    templates.forEach(template => {
      console.log(`- ${template.name}`);
    });

    // Check workflows
    const workflows = await Workflow.find();
    console.log('\nWorkflows:', workflows.length);
    workflows.forEach(workflow => {
      console.log(`- ${workflow.name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verifyMigration();