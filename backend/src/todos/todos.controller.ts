import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TodosService } from './todos.service.js';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';

@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  findAll(
    @Request() req: { user: { sub: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit ?? '10', 10) || 10));
    return this.todosService.findAll(req.user.sub, p, l);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.todosService.findOne(id, req.user.sub);
  }

  @Post()
  create(
    @Body() dto: CreateTodoDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.todosService.create(dto, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTodoDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.todosService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.todosService.remove(id, req.user.sub);
  }
}
