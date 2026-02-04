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

  // Create services (10+ with some non-operational)
  const services = await Promise.all([
    prisma.service.create({
      data: { name: 'Elevators', status: 'Operational', sortOrder: 0 },
    }),
    prisma.service.create({
      data: { name: 'HVAC', status: 'Operational', sortOrder: 1 },
    }),
    prisma.service.create({
      data: { name: 'Hot Water', status: 'Maintenance', notes: 'Boiler maintenance until 3pm', sortOrder: 2 },
    }),
    prisma.service.create({
      data: { name: 'Parking Garage', status: 'Operational', sortOrder: 3 },
    }),
    prisma.service.create({
      data: { name: 'Package Room', status: 'Operational', notes: 'Open 7am-10pm', sortOrder: 4 },
    }),
    prisma.service.create({
      data: { name: 'Gym', status: 'Operational', notes: '24/7 access', sortOrder: 5 },
    }),
    prisma.service.create({
      data: { name: 'Pool', status: 'Maintenance', notes: 'Closed for cleaning, reopens tomorrow', sortOrder: 6 },
    }),
    prisma.service.create({
      data: { name: 'Rooftop Lounge', status: 'Operational', sortOrder: 7 },
    }),
    prisma.service.create({
      data: { name: 'Laundry Room', status: 'Operational', sortOrder: 8 },
    }),
    prisma.service.create({
      data: { name: 'Bike Storage', status: 'Outage', notes: 'Key card reader malfunction - use side entrance', sortOrder: 9 },
    }),
    prisma.service.create({
      data: { name: 'Guest Parking', status: 'Operational', sortOrder: 10 },
    }),
    prisma.service.create({
      data: { name: 'Concierge', status: 'Operational', notes: '8am-8pm daily', sortOrder: 11 },
    }),
  ]);

  // Create events using the 3 built-in images
  const events = await Promise.all([
    prisma.event.create({
      data: {
        title: 'Morning Yoga',
        subtitle: 'Saturday, 9:00 AM',
        details: JSON.stringify([
          'Start your weekend with a relaxing yoga session on the rooftop.',
          'All levels welcome. Mats provided.',
          '**RSVP at front desk**',
        ]),
        imageUrl: '/images/yoga.jpg',
        sortOrder: 0,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Bagel Brunch',
        subtitle: 'Sunday, 10:00 AM',
        details: JSON.stringify([
          'Join us in the community room for fresh bagels and coffee.',
          'Assorted cream cheeses and toppings available.',
          'Great way to meet your neighbors!',
        ]),
        imageUrl: '/images/bagels.jpg',
        sortOrder: 1,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Tequila Tasting Night',
        subtitle: 'Friday, 7:00 PM',
        details: JSON.stringify([
          'Sample premium tequilas from Mexico.',
          'Light appetizers included.',
          '$20 per person - **21+ only**',
          'Limited to 25 guests.',
        ]),
        imageUrl: '/images/tequila.jpg',
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
        imageUrl: '',
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

  // Create published snapshot that exactly matches current state
  // This ensures no "pending changes" appear in admin UI
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
  console.log(`  - 1 published snapshot (no pending changes)`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
