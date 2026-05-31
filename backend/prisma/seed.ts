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

  const created: Record<string, string> = {};
  for (const u of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
    created[u.email] = user.id;
    console.log(`  seeded ${u.role.padEnd(8)} ${u.email}`);
  }

  // Sample shifts for the current week so the roster isn't empty.
  // Monday of this week:
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));

  function shiftOn(dayOffset: number, startH: number, endH: number) {
    const s = new Date(monday);
    s.setDate(s.getDate() + dayOffset);
    s.setHours(startH, 0, 0, 0);
    const e = new Date(s);
    e.setHours(endH, 0, 0, 0);
    return { startsAt: s, endsAt: e };
  }

  const sampleShifts = [
    { email: 'chef@restaurant.test', position: Position.KITCHEN, off: 0, sh: 9, eh: 17 },
    { email: 'chef@restaurant.test', position: Position.KITCHEN, off: 1, sh: 9, eh: 17 },
    { email: 'bar@restaurant.test', position: Position.BAR, off: 0, sh: 16, eh: 23 },
    { email: 'wait@restaurant.test', position: Position.WAIT, off: 0, sh: 17, eh: 23 },
    { email: 'wait@restaurant.test', position: Position.WAIT, off: 2, sh: 17, eh: 23 },
  ];

  // Only seed shifts if none exist yet, so re-running doesn't pile them up.
  const existingShifts = await prisma.shift.count();
  if (existingShifts === 0) {
    for (const s of sampleShifts) {
      const { startsAt, endsAt } = shiftOn(s.off, s.sh, s.eh);
      await prisma.shift.create({
        data: {
          userId: created[s.email],
          startsAt,
          endsAt,
          position: s.position,
          published: true,
        },
      });
    }
    console.log(`  seeded ${sampleShifts.length} sample shifts`);
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
