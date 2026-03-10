import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testUser = {
    username: `authtest_${Date.now()}`,
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user
      .deleteMany({ where: { username: { startsWith: 'authtest_' } } })
      .catch(() => {});
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should create a user and return an accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('should reject duplicate username', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(res.body.message).toBe('Username already exists');
    });

    it('should reject weak password (< 8 chars)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ username: 'shortpw', password: '1234567' })
        .expect(400);
    });

    it('should reject short username (< 3 chars)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ username: 'ab', password: 'password123' })
        .expect(400);
    });

    it('should reject missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({})
        .expect(400);
    });

    it('should reject extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ username: 'extrafld', password: 'password123', role: 'admin' })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return accessToken for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(testUser)
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: testUser.username, password: 'wrongpassword' })
        .expect(401);

      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'nonexistent_user_xyz', password: 'password123' })
        .expect(401);

      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/profile', () => {
    let token: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(testUser);
      token = res.body.accessToken;
    });

    it('should return user info with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body.username).toBe(testUser.username);
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken123')
        .expect(401);
    });
  });
});
