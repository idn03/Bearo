"use client"

import { LayoutList, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LayoutMode } from "@/hooks/use-layout-preference"

interface LayoutToggleProps {
  layout: LayoutMode
  onToggle: () => void
}

export function LayoutToggle({ layout, onToggle }: LayoutToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
      aria-label={`Switch to ${layout === "compact" ? "card" : "compact"} view`}
    >
      {layout === "compact" ? (
        <LayoutGrid className="size-4" />
      ) : (
        <LayoutList className="size-4" />
      )}
    </Button>
  )
}
