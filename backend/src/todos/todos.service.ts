import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.todo.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.todo.count({ where: { userId } }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, userId: string) {
    const todo = await this.prisma.todo.findFirst({
      where: { id, userId },
    });

    if (!todo) {
      throw new NotFoundException('Todo not found');
    }

    return todo;
  }

  async create(dto: CreateTodoDto, userId: string) {
    return this.prisma.todo.create({
      data: {
        title: dto.title,
        description: dto.description,
        userId,
      },
    });
  }

  async update(id: string, dto: UpdateTodoDto, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.todo.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.todo.delete({
      where: { id },
    });
  }
}
