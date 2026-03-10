"use client"

import { useState, useEffect, useCallback } from "react"

export type LayoutMode = "compact" | "card"

const STORAGE_KEY = "bearo-layout-mode"

export function useLayoutPreference() {
  const [layout, setLayoutState] = useState<LayoutMode>("compact")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "compact" || stored === "card") {
      setLayoutState(stored)
    }
    setMounted(true)
  }, [])

  const setLayout = useCallback((mode: LayoutMode) => {
    setLayoutState(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [])

  const toggleLayout = useCallback(() => {
    setLayout(layout === "compact" ? "card" : "compact")
  }, [layout, setLayout])

  return { layout, setLayout, toggleLayout, mounted }
}
