"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useTodos } from "@/hooks/use-todos"
import { TodoForm } from "@/components/todo-form"
import { TodoList } from "@/components/todo-list"

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const {
    todos,
    total,
    page,
    totalPages,
    isLoading,
    setPage,
    createTodo,
    updateTodo,
    deleteTodo,
  } = useTodos()

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/")
    }
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Todos</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back 👋, {user.username}
        </p>
      </div>

      <div className="space-y-6">
        <TodoForm
          onSubmit={async (title, description) => {
            await createTodo(title, description)
          }}
        />

        <TodoList
          todos={todos}
          page={page}
          totalPages={totalPages}
          total={total}
          isLoading={isLoading}
          onPageChange={setPage}
          onUpdate={async (id, data) => {
            await updateTodo(id, data)
          }}
          onDelete={async (id) => {
            await deleteTodo(id)
          }}
        />
      </div>
    </main>
  )
}
