import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is missing');
  process.exit(1);
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Core Permissions
  const permissionsList = [
    { code: 'leads:read', description: 'Read lead records' },
    { code: 'leads:write', description: 'Create and update lead records' },
    { code: 'clients:read', description: 'Read client profile information' },
    { code: 'clients:write', description: 'Modify client profiles' },
    { code: 'opportunities:read', description: 'Read sales opportunities' },
    { code: 'opportunities:write', description: 'Modify sales opportunities' },
    { code: 'opportunities:approve', description: 'Approve high-value sales opportunities' },
    { code: 'quotations:read', description: 'Read client quotations and proposals' },
    { code: 'quotations:write', description: 'Create and modify quotations' },
    { code: 'quotations:approve', description: 'Approve quotations that exceed discount limits' },
    { code: 'billing:read', description: 'View billing invoices and payments' },
    { code: 'billing:write', description: 'Create, modify, and process billing invoices' },
    { code: 'tickets:read', description: 'View service tickets' },
    { code: 'iam:read', description: 'View users and role assignments in tenant' },
    { code: 'iam:write', description: 'Create, update, and assign roles to users in tenant' },
    { code: 'projects:read', description: 'Read project records and milestones' },
    { code: 'projects:write', description: 'Create and update projects and milestones' },
    { code: 'tasks:read', description: 'View tasks assigned to self or team' },
    { code: 'tasks:write', description: 'Create, update, and delete tasks' },
    { code: 'calendar:read', description: 'View calendar events and attendees' },
    { code: 'calendar:write', description: 'Create, edit, and delete own calendar events' },
  ];

  console.log('Locking in permissions...');
  const permissionsMap: Record<string, string> = {};
  for (const perm of permissionsList) {
    const record = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description },
      create: { code: perm.code, description: perm.description },
    });
    permissionsMap[perm.code] = record.id;
  }

  // 2. Create Core Roles
  const rolesList = [
    {
      name: 'SuperAdmin',
      description: 'Super administrator with full workspace bypass controls',
      permissions: Object.keys(permissionsMap),
    },
    {
      name: 'TenantAdmin',
      description: 'Organization tenant administrator',
      permissions: [
        'leads:read',
        'leads:write',
        'clients:read',
        'clients:write',
        'opportunities:read',
        'opportunities:write',
        'opportunities:approve',
        'quotations:read',
        'quotations:write',
        'quotations:approve',
        'billing:read',
        'billing:write',
        'tickets:read',
        'iam:read',
        'iam:write',
        'projects:read',
        'projects:write',
        'tasks:read',
        'tasks:write',
        'calendar:read',
        'calendar:write',
      ],
    },
    {
      name: 'SalesRepresentative',
      description: 'Frontline sales agent',
      permissions: [
        'leads:read',
        'leads:write',
        'clients:read',
        'opportunities:read',
        'opportunities:write',
        'quotations:read',
        'quotations:write',
        'projects:read',
        'tasks:read',
        'tasks:write',
        'calendar:read',
        'calendar:write',
        'billing:read',
        'billing:write',
      ],
    },
    {
      name: 'ClientContact',
      description: 'External client portal login user',
      permissions: ['tickets:read', 'clients:read'],
    },
  ];

  console.log('Locking in roles & mapping permissions...');
  const rolesMap: Record<string, string> = {};
  for (const r of rolesList) {
    let roleRecord = await prisma.role.findFirst({
      where: { name: r.name, organizationId: null },
    });
    if (!roleRecord) {
      roleRecord = await prisma.role.create({
        data: { name: r.name, description: r.description, organizationId: null },
      });
    } else {
      roleRecord = await prisma.role.update({
        where: { id: roleRecord.id },
        data: { description: r.description },
      });
    }
    rolesMap[r.name] = roleRecord.id;

    // Link permissions
    for (const permCode of r.permissions) {
      const permId = permissionsMap[permCode];
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roleRecord.id,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId: roleRecord.id,
          permissionId: permId,
        },
      });
    }
  }

  // 3. Create Default Organization (Tenant)
  console.log('Locking in default tenant...');
  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' }, // Deterministic UUID
    update: {
      name: 'Decent Global Outsourcing',
      subdomain: 'dgo',
      status: 'active',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Decent Global Outsourcing',
      subdomain: 'dgo',
      status: 'active',
    },
  });

  // 4. Create Default Account & Opportunities
  console.log('Locking in default account...');
  const account = await prisma.account.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {
      name: 'Acme Corporation',
      domain: 'acme.com',
      billingCountry: 'United States',
      organizationId: org.id,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Acme Corporation',
      domain: 'acme.com',
      billingCountry: 'United States',
      organizationId: org.id,
    },
  });

  console.log('Locking in default opportunities...');
  const opportunities = [
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'ACME - 10 Java Devs Squad',
      stage: 'DISCOVERY' as const,
      amount: new Prisma.Decimal(120000.00),
      probability: 10,
      closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days in future
      description: 'Long-term staffing agreement for backend development squad.',
      organizationId: org.id,
      accountId: account.id,
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'Globex Corp - Cloud Migration',
      stage: 'PROPOSAL' as const,
      amount: new Prisma.Decimal(450000.00),
      probability: 40,
      closeDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days in future
      description: 'Full AWS cloud migration project with 5 DevOps specialists.',
      organizationId: org.id,
      accountId: account.id,
    },
  ];

  for (const opp of opportunities) {
    await prisma.opportunity.upsert({
      where: { id: opp.id },
      update: {
        name: opp.name,
        stage: opp.stage,
        amount: opp.amount,
        probability: opp.probability,
        closeDate: opp.closeDate,
        description: opp.description,
      },
      create: opp,
    });
  }

  // 5. Create Default Quotations and Line Items
  console.log('Locking in default quotations...');
  const sampleQuotation = await prisma.quotation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      organizationId: org.id,
      opportunityId: '00000000-0000-0000-0000-000000000003',
      version: 1,
      discountPercentage: new Prisma.Decimal(10.00),
      taxPercentage: new Prisma.Decimal(5.00),
      subtotal: new Prisma.Decimal(14000.00),
      total: new Prisma.Decimal(13230.00), // (14000 * 0.9) * 1.05 = 12600 * 1.05 = 13230
      status: 'DRAFT',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      requiresApproval: false,
      approved: false,
    },
  });

  // Seed sample line items
  await prisma.quoteLineItem.deleteMany({
    where: { quotationId: sampleQuotation.id },
  });

  await prisma.quoteLineItem.createMany({
    data: [
      {
        quotationId: sampleQuotation.id,
        itemName: 'Senior Backend Engineer Pod',
        description: 'Dedicated senior developer support for backend scaling.',
        quantity: 1,
        unitPrice: new Prisma.Decimal(8000.00),
        subtotal: new Prisma.Decimal(8000.00),
      },
      {
        quotationId: sampleQuotation.id,
        itemName: 'Full Stack Engineer Pod',
        description: 'Dedicated developer support for visual design pages.',
        quantity: 1,
        unitPrice: new Prisma.Decimal(6000.00),
        subtotal: new Prisma.Decimal(6000.00),
      },
    ],
  });

  // 6. Create Default Project Onboardings and Milestones
  console.log('Locking in default project onboardings...');
  const sampleProject = await prisma.projectOnboarding.upsert({
    where: { id: '00000000-0000-0000-0000-000000000006' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000006',
      organizationId: org.id,
      opportunityId: '00000000-0000-0000-0000-000000000003',
      name: 'ACME - 10 Java Devs Squad - Project Onboarding',
      status: 'IN_PROGRESS',
      templateType: 'STAFF_AUGMENTATION',
      targetStartDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
  });

  const milestonesList = [
    { title: 'Kickoff Meeting Scheduled', completed: true, completedAt: new Date() },
    { title: 'Contract Signed & Uploaded', completed: true, completedAt: new Date() },
    { title: 'GitHub & Slack Handover', completed: false },
    { title: 'First Month Invoice Sent', completed: false },
  ];

  await prisma.onboardingMilestone.deleteMany({
    where: { projectOnboardingId: sampleProject.id },
  });

  for (const m of milestonesList) {
    await prisma.onboardingMilestone.create({
      data: {
        organizationId: org.id,
        projectOnboardingId: sampleProject.id,
        title: m.title,
        completed: m.completed,
        completedAt: m.completedAt || null,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('🌿 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
