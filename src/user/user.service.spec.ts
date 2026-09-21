import { UserService } from './user.service';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Role } from '../common/roles.enum';

describe('UserService', () => {
  let service: UserService;
  let prisma: any;
  let authService: any;
  let validationService: any;
  let logger: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
    };

    authService = {
      hashPassword: jest.fn(),
      validateUser: jest.fn(),
      generateToken: jest.fn(),
    };

    validationService = {
      validate: jest.fn((_schema, data) => data), // langsung balikin data apa adanya, gak beneran validasi
    };

    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    service = new UserService(prisma, validationService, authService, logger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if email already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'x@mail.com' });

      await expect(
        service.register({ name: 'Test', email: 'x@mail.com', password: '123456' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should always create user with role USER, ignoring any role in input', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      authService.hashPassword.mockResolvedValue('hashed_pw');
      prisma.user.create.mockResolvedValue({
        id: 1,
        name: 'Test',
        email: 'new@mail.com',
        password: 'hashed_pw',
        role: Role.USER,
      });

      await service.register({ name: 'Test', email: 'new@mail.com', password: '123456' });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ role: Role.USER }),
      });
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if credentials invalid', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@mail.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user and accessToken if credentials valid', async () => {
      const mockUser = { id: 1, name: 'Kenji', email: 'x@mail.com', role: Role.USER };
      authService.validateUser.mockResolvedValue(mockUser);
      authService.generateToken.mockResolvedValue('fake-jwt-token');
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login({ email: 'x@mail.com', password: '123456' });

      expect(result.accessToken).toBe('fake-jwt-token');
      expect(result.user.email).toBe('x@mail.com');
    });
  });

  describe('updateUser', () => {
    it('should throw NotFoundException if user does not exist', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(
        service.updateUser(1, { name: 'New Name' }),
        ).rejects.toThrow(NotFoundException);
    });

    it('should update name successfully', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: 1, name: 'Old Name', email: 'x@mail.com' });
        prisma.user.update.mockResolvedValue({ id: 1, name: 'New Name', email: 'x@mail.com', role: 'USER' });

        await service.updateUser(1, { name: 'New Name' });

        expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'New Name' },
        });
    });

    it('should throw ConflictException if new email already used by another user', async () => {
        prisma.user.findUnique
        .mockResolvedValueOnce({ id: 1, name: 'Test', email: 'old@mail.com' }) // panggilan pertama: cek user
        .mockResolvedValueOnce({ id: 2, email: 'taken@mail.com' });            // panggilan kedua: cek email

        await expect(
        service.updateUser(1, { email: 'taken@mail.com' }),
        ).rejects.toThrow(ConflictException);
    });

    it('should allow updating email to the same email user already owns', async () => {
        prisma.user.findUnique
        .mockResolvedValueOnce({ id: 1, name: 'Test', email: 'same@mail.com' })
        .mockResolvedValueOnce({ id: 1, email: 'same@mail.com' }); // id sama = pemilik sendiri

        prisma.user.update.mockResolvedValue({ id: 1, name: 'Test', email: 'same@mail.com', role: 'USER' });

        await service.updateUser(1, { email: 'same@mail.com' });

        expect(prisma.user.update).toHaveBeenCalled();
    });
    });
});