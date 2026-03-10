import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Todos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Two users for data isolation testing
  const userA = {
    username: `todotest_a_${Date.now()}`,
    password: 'password123',
  };
  const userB = {
    username: `todotest_b_${Date.now()}`,
    password: 'password123',
  };

  let tokenA: string;
  let tokenB: string;

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

    // Register both users
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(userA);
    tokenA = resA.body.accessToken;

    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(userB);
    tokenB = resB.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user
      .deleteMany({ where: { username: { startsWith: 'todotest_' } } })
      .catch(() => {});
    await app.close();
  });

  describe('POST /api/todos', () => {
    it('should create a todo for the authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/todos')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Test todo A' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Test todo A');
      expect(res.body.completed).toBe(false);
      expect(res.body.description).toBeNull();
    });

    it('should create a todo with description', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/todos')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Todo with desc', description: 'Some details' })
        .expect(201);

      expect(res.body.title).toBe('Todo with desc');
      expect(res.body.description).toBe('Some details');
    });

    it('should reject empty title', async () => {
      await request(app.getHttpServer())
        .post('/api/todos')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: '' })
        .expect(400);
    });

    it('should reject missing title', async () => {
      await request(app.getHttpServer())
        .post('/api/todos')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({})
        .expect(400);
    });

    it('should reject request without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/todos')
        .send({ title: 'No auth' })
        .expect(401);
    });
  });

  describe('GET /api/todos', () => {
    it('should return only the current user\'s todos', async () => {
      // Create a todo for user B
      await request(app.getHttpServer())
        .post('/api/todos')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'User B todo' });

      // User A should not see user B's todo
      const res = await request(app.getHttpServer())
        .get('/api/todos')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');

      const titles = res.body.data.map((t: { title: string }) => t.title);
      expect(titles).not.toContain('User B todo');
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/todos?page=1&limit=1')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(1);
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer()).get('/api/todos').expect(401);
    });
  });

  describe('GET /api/todos/:id', () => {
    let todoId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/todos')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Findable todo' });
      todoId = res.body.id;
    });

    it('should return a single todo by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.id).toBe(todoId);
      expect(res.body.title).toBe('Findable todo');
    });

    it('should return 404 for another user\'s todo', async () => {
      await request(app.getHttpServer())
        .get(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('should return 404 for non-existent todo', async () => {
      await request(app.getHttpServer())
        .get('/api/todos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });
  });

  describe('PATCH /api/todos/:id', () => {
    let todoId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/todos')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Updatable todo' });
      todoId = res.body.id;
    });

    it('should update the todo title', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Updated title' })
        .expect(200);

      expect(res.body.title).toBe('Updated title');
    });

    it('should toggle completion status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ completed: true })
        .expect(200);

      expect(res.body.completed).toBe(true);
    });

    it('should return 404 for another user\'s todo', async () => {
      await request(app.getHttpServer())
        .patch(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'Hacked' })
        .expect(404);
    });
  });

  describe('DELETE /api/todos/:id', () => {
    let todoId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/todos')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Deletable todo' });
      todoId = res.body.id;
    });

    it('should return 404 for another user\'s todo', async () => {
      await request(app.getHttpServer())
        .delete(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('should delete the todo', async () => {
      await request(app.getHttpServer())
        .delete(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });
  });
});
