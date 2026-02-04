import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.$transaction([
    prisma.publishedSnapshot.deleteMany(),
    prisma.service.deleteMany(),
    prisma.event.deleteMany(),
    prisma.advisory.deleteMany(),
    prisma.buildingConfig.deleteMany(),
  ]);

  // Create building config
  const config = await prisma.buildingConfig.create({
    data: {
      buildingNumber: '77',
      buildingName: 'Hudson',
      subtitle: 'Building Services Dashboard',
      scrollSpeed: 50,
      tickerSpeed: 30,
    },
  });

  // Create services
  const services = await Promise.all([
    prisma.service.create({
      data: { name: 'Elevators', status: 'Operational', sortOrder: 0 },
    }),
    prisma.service.create({
      data: { name: 'HVAC', status: 'Operational', sortOrder: 1 },
    }),
    prisma.service.create({
      data: { name: 'Hot Water', status: 'Operational', sortOrder: 2 },
    }),
    prisma.service.create({
      data: { name: 'Parking Garage', status: 'Operational', sortOrder: 3 },
    }),
    prisma.service.create({
      data: { name: 'Package Room', status: 'Operational', notes: 'Open 7am-10pm', sortOrder: 4 },
    }),
  ]);

  // Create events
  const events = await Promise.all([
    prisma.event.create({
      data: {
        title: 'Rooftop Social',
        subtitle: 'Friday, 6:00 PM',
        details: JSON.stringify([
          'Join your neighbors for drinks and appetizers on the rooftop terrace.',
          '**RSVP required** - Sign up at the front desk by Thursday.',
        ]),
        imageUrl: '/preset-rooftop.jpg',
        sortOrder: 0,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Yoga in the Park',
        subtitle: 'Saturday, 9:00 AM',
        details: JSON.stringify([
          'Free yoga session at Hudson River Park.',
          'Bring your own mat. All levels welcome.',
        ]),
        imageUrl: '/preset-yoga.jpg',
        sortOrder: 1,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Wine Tasting Night',
        subtitle: 'Next Wednesday, 7:00 PM',
        details: JSON.stringify([
          'Sample wines from local vineyards.',
          '$25 per person - includes cheese pairings.',
          'Limited to 30 guests.',
        ]),
        imageUrl: '/preset-wine.jpg',
        sortOrder: 2,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Building Maintenance Notice',
        subtitle: 'Scheduled Work',
        details: JSON.stringify([
          'Fire alarm testing on **Monday 10am-2pm**.',
          'Please disregard alarms during this time.',
          'Contact management with questions.',
        ]),
        sortOrder: 3,
      },
    }),
  ]);

  // Create advisories
  const advisories = await Promise.all([
    prisma.advisory.create({
      data: {
        label: 'REMINDER',
        message: 'Guest parking validation available at front desk',
        active: true,
      },
    }),
    prisma.advisory.create({
      data: {
        label: 'NOTICE',
        message: 'Pool hours extended to 10pm for summer season',
        active: true,
      },
    }),
  ]);

  // Create initial published snapshot
  const state = {
    services: services.map(s => ({
      id: s.id,
      name: s.name,
      status: s.status,
      notes: s.notes,
      lastChecked: s.lastChecked.toISOString(),
      sortOrder: s.sortOrder,
    })),
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      subtitle: e.subtitle,
      details: JSON.parse(e.details),
      imageUrl: e.imageUrl,
      accentColor: e.accentColor,
      sortOrder: e.sortOrder,
    })),
    advisories: advisories.map(a => ({
      id: a.id,
      label: a.label,
      message: a.message,
      active: a.active,
    })),
    config: {
      id: config.id,
      buildingNumber: config.buildingNumber,
      buildingName: config.buildingName,
      subtitle: config.subtitle,
      scrollSpeed: config.scrollSpeed,
      tickerSpeed: config.tickerSpeed,
    },
  };

  await prisma.publishedSnapshot.create({
    data: {
      version: 1,
      data: JSON.stringify(state),
    },
  });

  console.log('Database seeded successfully!');
  console.log(`  - ${services.length} services`);
  console.log(`  - ${events.length} events`);
  console.log(`  - ${advisories.length} advisories`);
  console.log(`  - 1 published snapshot`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
