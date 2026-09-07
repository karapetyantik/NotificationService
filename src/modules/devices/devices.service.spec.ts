import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('DevicesService', () => {
  let service: DevicesService;
  let prisma: {
    deviceToken: {
      findUnique: jest.Mock;
      delete: jest.Mock;
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      deviceToken: {
        findUnique: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DevicesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(DevicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lets a user unregister their own device', async () => {
    prisma.deviceToken.findUnique.mockResolvedValue({
      token: 't1',
      userId: 'user1',
    });

    await expect(service.unregisterDevice('user1', 't1')).resolves.toEqual({
      success: true,
    });
    expect(prisma.deviceToken.delete).toHaveBeenCalledWith({
      where: { token: 't1' },
    });
  });

  it('refuses to unregister a device belonging to someone else', async () => {
    prisma.deviceToken.findUnique.mockResolvedValue({
      token: 't1',
      userId: 'someone-else',
    });

    await expect(service.unregisterDevice('user1', 't1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.deviceToken.delete).not.toHaveBeenCalled();
  });

  it('404s on an unknown device token', async () => {
    prisma.deviceToken.findUnique.mockResolvedValue(null);

    await expect(
      service.unregisterDevice('user1', 'does-not-exist'),
    ).rejects.toThrow(NotFoundException);
  });
});
