"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/avatar"
import { updateAvatarVariant, updateAvatarColors, type AvatarData } from "@/lib/firebase-avatar-storage"
import { DEFAULT_AVATAR_COLORS } from "@/lib/firebase-avatar-storage"

interface AvatarCustomizerProps {
  id: string
  name: string
  type: "user" | "group"
  currentAvatarData: AvatarData
  onUpdate?: (newData: AvatarData) => void
}

const AVATAR_VARIANTS = [
  { value: "marble", label: "Marble", description: "Organic, flowing patterns" },
  { value: "beam", label: "Beam", description: "Geometric, structured patterns" },
  { value: "pixel", label: "Pixel", description: "Pixelated, retro style" },
  { value: "sunset", label: "Sunset", description: "Gradient-based patterns" },
  { value: "ring", label: "Ring", description: "Circular, layered patterns" },
  { value: "bauhaus", label: "Bauhaus", description: "Modern, geometric style" },
] as const

const COLOR_PRESETS = [
  {
    name: "Emerald (Default)",
    colors: DEFAULT_AVATAR_COLORS,
  },
  {
    name: "Ocean",
    colors: ["#0ea5e9", "#0284c7", "#0369a1", "#075985", "#0c4a6e", "#7dd3fc", "#bae6fd", "#e0f2fe"],
  },
  {
    name: "Sunset",
    colors: ["#f97316", "#ea580c", "#dc2626", "#b91c1c", "#991b1b", "#fed7aa", "#fdba74", "#fb923c"],
  },
  {
    name: "Purple",
    colors: ["#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6", "#4c1d95", "#c4b5fd", "#a78bfa", "#8b5cf6"],
  },
  {
    name: "Pink",
    colors: ["#ec4899", "#db2777", "#be185d", "#9d174d", "#831843", "#f9a8d4", "#f472b6", "#ec4899"],
  },
]

export function AvatarCustomizer({ 
  id, 
  name, 
  type, 
  currentAvatarData, 
  onUpdate 
}: AvatarCustomizerProps) {
  const [selectedVariant, setSelectedVariant] = useState(currentAvatarData.variant)
  const [selectedColors, setSelectedColors] = useState(currentAvatarData.customColors || currentAvatarData.colors)

  const handleVariantChange = async (variant: AvatarData["variant"]) => {
    setSelectedVariant(variant)
    
    try {
      await updateAvatarVariant(id, variant, type)
      
      if (onUpdate) {
        onUpdate({
          ...currentAvatarData,
          variant,
          lastUpdated: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error("[FundFlow] Failed to update avatar variant:", error)
      // Revert the selection on error
      setSelectedVariant(currentAvatarData.variant)
    }
  }

  const handleColorChange = async (colors: string[]) => {
    setSelectedColors(colors)
    
    try {
      await updateAvatarColors(id, colors, type)
      
      if (onUpdate) {
        onUpdate({
          ...currentAvatarData,
          customColors: colors,
          lastUpdated: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error("[FundFlow] Failed to update avatar colors:", error)
      // Revert the selection on error
      setSelectedColors(currentAvatarData.customColors || currentAvatarData.colors)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Avatar
            name={name}
            variant={selectedVariant}
            colors={selectedColors}
            size={40}
            type={type}
            id={id}
          />
          Customize {type === "user" ? "Your" : "Group"} Avatar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview */}
        <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg">
          <Avatar
            name={name}
            variant={selectedVariant}
            colors={selectedColors}
            size={120}
            type={type}
            id={id}
          />
        </div>

        {/* Variant Selection */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Style</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {AVATAR_VARIANTS.map((variant) => (
              <Button
                key={variant.value}
                variant={selectedVariant === variant.value ? "default" : "outline"}
                className="h-auto p-3 flex flex-col items-center gap-2"
                onClick={() => handleVariantChange(variant.value)}
              >
                <Avatar
                  name={name}
                  variant={variant.value}
                  colors={selectedColors}
                  size={32}
                  type={type}
                  id={id}
                />
                <div className="text-center">
                  <div className="font-medium text-sm">{variant.label}</div>
                  <div className="text-xs text-muted-foreground">{variant.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Color Selection */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Color Theme</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {COLOR_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                className="h-auto p-3 flex items-center gap-3"
                onClick={() => handleColorChange(preset.colors)}
              >
                <div className="flex gap-1">
                  {preset.colors.slice(0, 4).map((color, index) => (
                    <div
                      key={index}
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="font-medium">{preset.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
