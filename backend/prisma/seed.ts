import { PrismaClient, Role, Position } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Sample staff covering every role. All share the password below so you can
// log in as each one and see how the dashboard changes per role.
const PASSWORD = 'password123';

const seedUsers = [
  {
    email: 'owner@restaurant.test',
    firstName: 'Olivia',
    lastName: 'Owner',
    role: Role.OWNER,
    position: Position.MANAGEMENT,
    hourlyRateCents: 0,
  },
  {
    email: 'manager@restaurant.test',
    firstName: 'Marco',
    lastName: 'Manager',
    role: Role.MANAGER,
    position: Position.MANAGEMENT,
    hourlyRateCents: 4500,
  },
  {
    email: 'chef@restaurant.test',
    firstName: 'Kenji',
    lastName: 'Cook',
    role: Role.KITCHEN,
    position: Position.KITCHEN,
    hourlyRateCents: 3200,
  },
  {
    email: 'bar@restaurant.test',
    firstName: 'Bianca',
    lastName: 'Barkeep',
    role: Role.FLOOR,
    position: Position.BAR,
    hourlyRateCents: 2900,
  },
  {
    email: 'wait@restaurant.test',
    firstName: 'Wren',
    lastName: 'Waiter',
    role: Role.FLOOR,
    position: Position.WAIT,
    hourlyRateCents: 2800,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const u of seedUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
    console.log(`  seeded ${u.role.padEnd(8)} ${u.email}`);
  }

  console.log(`\nAll seed users share the password: ${PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
