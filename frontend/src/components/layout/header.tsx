"use client"

import { useState } from "react"
import Image from "next/image"
import { Settings, LogOut, SunMoon } from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LoginDialog } from "@/components/auth/login-dialog"
import { RegisterDialog } from "@/components/auth/register-dialog"

export function Header() {
  const { user, isLoading, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-5 flex h-14 max-w-full items-center justify-between px-4">
        <Image
          src="/logo-text.svg"
          alt="Bearo"
          width={60}
          height={30}
          className="dark:invert-0 invert"
          priority
        />

        {isLoading ? (
          <div className="h-8 w-24" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" aria-label="Settings" />}
            >
              <Settings className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <SunMoon className="size-4" />
                Toggle theme
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setLoginOpen(true)}>
              Log in
            </Button>
            <Button onClick={() => setRegisterOpen(true)}>
              Register
            </Button>
            <ThemeToggle />
            <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
            <RegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} />
          </div>
        )}
      </div>
    </header>
  )
}
