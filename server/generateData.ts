import type { Location } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { prisma } from "../src/server/lib/prisma.ts"


async function generateTestData() {
  try {
    // Clear existing data
    await prisma.verification.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.itemRecord.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.consumable.deleteMany();
    await prisma.item.deleteMany();
    await prisma.location.deleteMany();
    await prisma.user.deleteMany();
    await prisma.group.deleteMany();

    // Generate Groups
    const groups = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        prisma.group.create({
          data: {
            name: faker.company.name(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      )
    );

    // Generate Locations with hierarchy
    const locations: Location[] = []; // Explicitly type as Location[]
    for (let i = 0; i < 10; i++) {
      const location = await prisma.location.create({
        data: {
          name: `${faker.location.city()} Warehouse`,
          // Only assign parentId to an existing Location ID (or null for first location)
          parentId: i > 0 ? faker.helpers.arrayElement(locations).id : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      locations.push(location);
    }

    // Generate Tags
    const tags = await Promise.all(
      Array.from({ length: 10 }).map(() =>
        prisma.tag.create({
          data: {
            name: faker.commerce.productAdjective(),
            type: faker.helpers.arrayElement(['category', 'status', 'priority']),
            colour: faker.color.rgb({ prefix: '#' }),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      )
    );

    // Generate Users
    const users = await Promise.all(
      Array.from({ length: 20 }).map(() =>
        prisma.user.create({
          data: {
            name: faker.person.fullName(),
            email: faker.internet.email(),
            emailVerified: faker.datatype.boolean(),
            image: faker.image.avatar(),
            groupId: faker.helpers.arrayElement(groups).id,
            role: faker.helpers.arrayElement(['user', 'admin']),
            banned: faker.datatype.boolean(0.1),
            banReason: faker.datatype.boolean(0.1) ? faker.lorem.sentence() : null,
            banExpires: faker.datatype.boolean(0.1) ? faker.date.future() : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      )
    );

    // Generate Items and Consumables
    const items = await Promise.all(
      Array.from({ length: 50 }).map(() =>
        prisma.item.createSerial({
          data: {
            name: faker.commerce.productName(),
            image: faker.image.urlPicsumPhotos({width: 1024, height: 1024}),
            locationId: faker.helpers.arrayElement(locations).id,
            stored: faker.datatype.boolean(),
            cost: faker.number.int({ min: 0, max: 1000 }),
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: {
              connect: faker.helpers.arrayElements(tags, { min: 1, max: 4 }).map(tag => ({
                id: tag.id
              }))
            },
            consumable: faker.datatype.boolean(0.3) ? {
              create: {
                available: faker.number.int({ min: 0, max: 100 }),
                total: faker.number.int({ min: 100, max: 1000 }),
              },
            } : undefined,
          },
        })
      )
    );

    // Generate ItemRecords
    await Promise.all(
      items.map((item) =>
        prisma.itemRecord.create({
          data: {
            loaned: faker.datatype.boolean(),
            actionByUserId: faker.helpers.arrayElement(users).id,
            itemId: item.id,
            notes: faker.datatype.boolean(0.7) ? faker.lorem.paragraph() : null,
            quantity: faker.number.int({ min: 1, max: 10 }),
          },
        })
      )
    );

    // Generate Accounts
    await Promise.all(
      users.map((user) =>
        prisma.account.create({
          data: {
            id: faker.string.uuid(), // Add required id field
            accountId: faker.string.uuid(),
            providerId: faker.helpers.arrayElement(['google', 'github', 'email']),
            userId: user.id,
            accessToken: faker.string.alphanumeric(32),
            refreshToken: faker.string.alphanumeric(32),
            idToken: faker.string.alphanumeric(32),
            accessTokenExpiresAt: faker.date.future(),
            refreshTokenExpiresAt: faker.date.future(),
            scope: 'profile email',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      )
    );

    // Generate Sessions
    await Promise.all(
      users.map((user) =>
        prisma.session.create({
          data: {
            id: faker.string.uuid(),
            expiresAt: faker.date.future(),
            token: faker.string.alphanumeric(64),
            createdAt: new Date(),
            updatedAt: new Date(),
            ipAddress: faker.internet.ip(),
            userAgent: faker.internet.userAgent(),
            userId: user.id,
            impersonatedBy: faker.datatype.boolean(0.1) ? faker.helpers.arrayElement(users).id : null,
          },
        })
      )
    );

    // Generate Verifications
    await Promise.all(
      users.map((user) =>
        prisma.verification.create({
          data: {
            id: faker.string.uuid(),
            identifier: user.email,
            value: faker.string.alphanumeric(32),
            expiresAt: faker.date.future(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      )
    );

    console.log('Test data generated successfully!');
  } catch (error) {
    console.error('Error generating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateTestData();
