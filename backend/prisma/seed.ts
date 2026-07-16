import { PrismaClient } from '@prisma/client';
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
    { code: 'billing:read', description: 'View billing invoices and payments' },
    { code: 'tickets:read', description: 'View service tickets' },
    { code: 'iam:read', description: 'View users and role assignments in tenant' },
    { code: 'iam:write', description: 'Create, update, and assign roles to users in tenant' },
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
      permissions: ['leads:read', 'leads:write', 'clients:read', 'clients:write', 'opportunities:read', 'billing:read', 'tickets:read', 'iam:read', 'iam:write'],
    },
    {
      name: 'SalesRepresentative',
      description: 'Frontline sales agent',
      permissions: ['leads:read', 'leads:write', 'clients:read', 'opportunities:read'],
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
    const roleRecord = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });
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

  // 4. Create Default SuperAdmin User
  console.log('Locking in default SuperAdmin user...');
  const email = 'superadmin@dgo.com';
  const passwordHash = await bcrypt.hash('DgoSecure2026!', 10);
  
  const superAdminUser = await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' }, // Deterministic UUID
    update: {
      email,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      status: 'active',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      email,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      status: 'active',
    },
  });

  // 5. Associate User to Organization with SuperAdmin Role
  console.log('Mapping user to tenant...');
  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: superAdminUser.id,
        organizationId: org.id,
      },
    },
    update: {
      roleId: rolesMap['SuperAdmin'],
    },
    create: {
      userId: superAdminUser.id,
      organizationId: org.id,
      roleId: rolesMap['SuperAdmin'],
    },
  });

  console.log('🌿 Seeding completed successfully!');
  console.log(`\nDefault SuperAdmin Credentials:`);
  console.log(`Email: ${email}`);
  console.log(`Password: DgoSecure2026!`);
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
