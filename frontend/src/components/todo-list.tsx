"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TodoItem } from "@/components/todo-item"
import type { Todo } from "@/types"
import type { LayoutMode } from "@/hooks/use-layout-preference"

interface TodoListProps {
  todos: Todo[]
  page: number
  totalPages: number
  total: number
  isLoading: boolean
  layout: LayoutMode
  onPageChange: (page: number) => void
  onUpdate: (
    id: string,
    data: { title?: string; description?: string; completed?: boolean }
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function TodoList({
  todos,
  page,
  totalPages,
  total,
  isLoading,
  layout,
  onPageChange,
  onUpdate,
  onDelete,
}: TodoListProps) {
  if (isLoading) {
    return (
      <div className={layout === "card" ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-2"}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`animate-pulse rounded-lg bg-muted/50 ${
              layout === "card" ? "h-28" : "h-12"
            }`}
          />
        ))}
      </div>
    )
  }

  if (todos.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No todos yet. Create one above!</p>
      </div>
    )
  }

  return (
    <div>
      <div
        className={
          layout === "card"
            ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
            : "space-y-1"
        }
      >
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            layout={layout}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {total} todo{total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
