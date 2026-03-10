import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TodosService } from './todos.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TodosService', () => {
  let service: TodosService;
  let prisma: {
    todo: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const mockTodo = {
    id: 'todo-id-1',
    title: 'Test todo',
    description: null,
    completed: false,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      todo: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TodosService>(TodosService);
  });

  describe('findAll', () => {
    it('should return paginated todos scoped to userId', async () => {
      prisma.todo.findMany.mockResolvedValue([mockTodo]);
      prisma.todo.count.mockResolvedValue(1);

      const result = await service.findAll('user-1', 1, 10);

      expect(prisma.todo.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: [mockTodo],
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('should calculate correct skip for page 2', async () => {
      prisma.todo.findMany.mockResolvedValue([]);
      prisma.todo.count.mockResolvedValue(0);

      await service.findAll('user-1', 2, 10);

      expect(prisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10 }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a todo by id and userId', async () => {
      prisma.todo.findFirst.mockResolvedValue(mockTodo);

      const result = await service.findOne('todo-id-1', 'user-1');

      expect(prisma.todo.findFirst).toHaveBeenCalledWith({
        where: { id: 'todo-id-1', userId: 'user-1' },
      });
      expect(result).toEqual(mockTodo);
    });

    it('should throw NotFoundException if todo does not exist', async () => {
      prisma.todo.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for another user\'s todo', async () => {
      prisma.todo.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('todo-id-1', 'user-2'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a todo with userId', async () => {
      prisma.todo.create.mockResolvedValue(mockTodo);

      const result = await service.create(
        { title: 'Test todo' },
        'user-1',
      );

      expect(prisma.todo.create).toHaveBeenCalledWith({
        data: {
          title: 'Test todo',
          description: undefined,
          userId: 'user-1',
        },
      });
      expect(result).toEqual(mockTodo);
    });
  });

  describe('update', () => {
    it('should update a todo after verifying ownership', async () => {
      prisma.todo.findFirst.mockResolvedValue(mockTodo);
      prisma.todo.update.mockResolvedValue({
        ...mockTodo,
        completed: true,
      });

      const result = await service.update(
        'todo-id-1',
        { completed: true },
        'user-1',
      );

      expect(result.completed).toBe(true);
    });

    it('should throw NotFoundException for another user\'s todo', async () => {
      prisma.todo.findFirst.mockResolvedValue(null);

      await expect(
        service.update('todo-id-1', { title: 'Hacked' }, 'user-2'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a todo after verifying ownership', async () => {
      prisma.todo.findFirst.mockResolvedValue(mockTodo);
      prisma.todo.delete.mockResolvedValue(mockTodo);

      const result = await service.remove('todo-id-1', 'user-1');

      expect(prisma.todo.delete).toHaveBeenCalledWith({
        where: { id: 'todo-id-1' },
      });
      expect(result).toEqual(mockTodo);
    });

    it('should throw NotFoundException for another user\'s todo', async () => {
      prisma.todo.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('todo-id-1', 'user-2'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
