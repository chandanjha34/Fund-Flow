"use client"

import React, { useState, useEffect } from "react"
import BoringAvatar from "boring-avatars"
import { cn } from "@/lib/utils"
import { getAvatarData, type AvatarData, DEFAULT_AVATAR_COLORS } from "@/lib/firebase-avatar-storage"

interface AvatarProps {
  name: string
  size?: number
  variant?: "marble" | "beam" | "pixel" | "sunset" | "ring" | "bauhaus"
  className?: string
  colors?: string[]
  type?: "user" | "group" // Add type to distinguish between user and group avatars
  id?: string // Optional ID for storage (defaults to name if not provided)
}

export function Avatar({ 
  name, 
  size = 40, 
  variant, 
  className,
  colors,
  type = "user",
  id
}: AvatarProps) {
  const [avatarData, setAvatarData] = useState<AvatarData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAvatarData = async () => {
      try {
        const avatarId = id || name
        const storedData = await getAvatarData(avatarId, name, type)
        setAvatarData(storedData)
      } catch (error) {
        console.error("[FundFlow] Failed to load avatar data:", error)
        // Set fallback data
        setAvatarData({
          id: id || name,
          name,
          variant: type === "user" ? "marble" : "beam",
          colors: DEFAULT_AVATAR_COLORS,
          lastUpdated: new Date().toISOString()
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadAvatarData()
  }, [name, type, id])

  if (isLoading) {
    return (
      <div 
        className={cn(
          "rounded-full bg-muted animate-pulse flex items-center justify-center",
          className
        )}
        style={{ width: size, height: size }}
      >
        <div className="w-1/2 h-1/2 bg-muted-foreground/20 rounded-full" />
      </div>
    )
  }

  if (!avatarData) {
    // Fallback to initials if no avatar data
    const initials = name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)

    return (
      <div 
        className={cn(
          "rounded-full bg-accent flex items-center justify-center text-white font-semibold",
          className
        )}
        style={{ width: size, height: size, fontSize: `${size * 0.4}px` }}
      >
        {initials}
      </div>
    )
  }

  return (
    <div className={cn("rounded-full overflow-hidden", className)}>
      <BoringAvatar
        size={size}
        name={name}
        variant={variant || avatarData.variant}
        colors={colors || avatarData.customColors || avatarData.colors}
      />
    </div>
  )
}

// Specialized components for different use cases
export function UserAvatar({ 
  name, 
  size = 40, 
  className,
  id
}: Omit<AvatarProps, "variant" | "colors" | "type"> & { id?: string }) {
  return (
    <Avatar
      name={name}
      size={size}
      type="user"
      id={id}
      className={className}
    />
  )
}

export function GroupAvatar({ 
  name, 
  size = 40, 
  className,
  id
}: Omit<AvatarProps, "variant" | "colors" | "type"> & { id?: string }) {
  return (
    <Avatar
      name={name}
      size={size}
      type="group"
      id={id}
      className={className}
    />
  )
}

// Avatar with initials fallback
export function AvatarWithInitials({ 
  name, 
  size = 40, 
  className,
  fallbackText 
}: AvatarProps & { fallbackText?: string }) {
  const initials = fallbackText || name
    .split(" ")
    .map(word => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={cn("relative", className)}>
      <Avatar
        name={name}
        size={size}
        variant="marble"
      />
      <div 
        className="absolute inset-0 flex items-center justify-center text-white font-semibold text-xs pointer-events-none"
        style={{ fontSize: `${size * 0.3}px` }}
      >
        {initials}
      </div>
    </div>
  )
}
