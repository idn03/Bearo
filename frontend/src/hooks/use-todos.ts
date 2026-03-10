"use client"

import { useState, useEffect, useCallback } from "react"
import api from "@/lib/api"
import type { Todo, PaginatedResponse } from "@/types"

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [isLoading, setIsLoading] = useState(true)

  const totalPages = Math.ceil(total / limit)

  const fetchTodos = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get<PaginatedResponse<Todo>>("/todos", {
        params: { page, limit },
      })
      setTodos(res.data.data)
      setTotal(res.data.total)
    } catch {
      // handled by API interceptor
    } finally {
      setIsLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const createTodo = async (title: string, description?: string) => {
    const res = await api.post<Todo>("/todos", { title, description })
    // If on page 1, prepend; otherwise go to page 1 to see it
    if (page === 1) {
      await fetchTodos()
    } else {
      setPage(1)
    }
    return res.data
  }

  const updateTodo = async (
    id: string,
    data: { title?: string; description?: string; completed?: boolean }
  ) => {
    const res = await api.patch<Todo>(`/todos/${id}`, data)
    setTodos((prev) => prev.map((t) => (t.id === id ? res.data : t)))
    return res.data
  }

  const deleteTodo = async (id: string) => {
    await api.delete(`/todos/${id}`)
    await fetchTodos()
  }

  return {
    todos,
    total,
    page,
    totalPages,
    isLoading,
    setPage,
    createTodo,
    updateTodo,
    deleteTodo,
  }
}
