"use client"

import { useState } from "react"
import { Check, Circle, Pencil, Trash2, X, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Todo } from "@/types"

interface TodoItemProps {
  todo: Todo
  onUpdate: (
    id: string,
    data: { title?: string; description?: string; completed?: boolean }
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function TodoItem({ todo, onUpdate, onDelete }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)
  const [editDescription, setEditDescription] = useState(
    todo.description ?? ""
  )
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async () => {
    setIsLoading(true)
    try {
      await onUpdate(todo.id, { completed: !todo.completed })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editTitle.trim()) return
    setIsLoading(true)
    try {
      await onUpdate(todo.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      })
      setIsEditing(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await onDelete(todo.id)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setEditTitle(todo.title)
    setEditDescription(todo.description ?? "")
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-ring/30 bg-muted/30 p-3">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          disabled={isLoading}
          maxLength={255}
          autoFocus
        />
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          disabled={isLoading}
          rows={2}
          placeholder="Description (optional)"
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none dark:bg-input/30"
        />
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLoading || !editTitle.trim()}
          >
            <Save className="size-3.5" />
            Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:bg-muted/50">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
      >
        {todo.completed ? (
          <Check className="size-5 text-primary" />
        ) : (
          <Circle className="size-5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-snug ${
            todo.completed
              ? "text-muted-foreground line-through"
              : "text-foreground"
          }`}
        >
          {todo.title}
        </p>
        {todo.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {todo.description}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setIsEditing(true)}
          disabled={isLoading}
          aria-label="Edit todo"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon-xs"
          onClick={handleDelete}
          disabled={isLoading}
          aria-label="Delete todo"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
