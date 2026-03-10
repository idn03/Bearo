"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import type { User } from "@/types"

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get<User>("/auth/profile")
      setUser(res.data)
    } catch {
      localStorage.removeItem("token")
      setToken(null)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (storedToken) {
      setToken(storedToken)
      fetchProfile().finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [fetchProfile])

  const login = async (username: string, password: string) => {
    const res = await api.post<{ accessToken: string }>("/auth/login", {
      username,
      password,
    })
    const newToken = res.data.accessToken
    localStorage.setItem("token", newToken)
    setToken(newToken)
    await fetchProfile()
  }

  const register = async (username: string, password: string) => {
    const res = await api.post<{ accessToken: string }>("/auth/register", {
      username,
      password,
    })
    const newToken = res.data.accessToken
    localStorage.setItem("token", newToken)
    setToken(newToken)
    await fetchProfile()
  }

  const logout = () => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
    router.push("/")
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
