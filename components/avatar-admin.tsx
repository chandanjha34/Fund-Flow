"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/avatar"
import { 
  getAllStoredAvatars, 
  clearAllAvatarData, 
  deleteAvatarData,
  type AvatarData 
} from "@/lib/firebase-avatar-storage"
import { Trash2, RefreshCw, Users, Building2 } from "lucide-react"

export function AvatarAdmin() {
  const [avatars, setAvatars] = useState<{ users: AvatarData[], groups: AvatarData[] }>({ users: [], groups: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)

  const loadAvatars = async () => {
    setIsLoading(true)
    try {
      const data = await getAllStoredAvatars()
      setAvatars(data)
    } catch (error) {
      console.error("[FundFlow] Failed to load avatars:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear ALL avatar data? This action cannot be undone.")) {
      return
    }

    setIsClearing(true)
    try {
      await clearAllAvatarData()
      await loadAvatars()
      alert("All avatar data has been cleared successfully!")
    } catch (error) {
      console.error("[FundFlow] Failed to clear avatar data:", error)
      alert("Failed to clear avatar data. Please try again.")
    } finally {
      setIsClearing(false)
    }
  }

  const handleDeleteAvatar = async (id: string, type: "user" | "group") => {
    if (!confirm(`Are you sure you want to delete this ${type} avatar?`)) {
      return
    }

    try {
      await deleteAvatarData(id, type)
      await loadAvatars()
      alert("Avatar deleted successfully!")
    } catch (error) {
      console.error("[FundFlow] Failed to delete avatar:", error)
      alert("Failed to delete avatar. Please try again.")
    }
  }

  useEffect(() => {
    loadAvatars()
  }, [])

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Avatar Administration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading avatars...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Avatar Administration
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadAvatars} disabled={isLoading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleClearAll} 
                disabled={isClearing}
              >
                {isClearing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Avatars */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Avatars ({avatars.users.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {avatars.users.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No user avatars found</p>
                ) : (
                  avatars.users.map((avatar) => (
                    <div key={avatar.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Avatar
                        name={avatar.name}
                        variant={avatar.variant}
                        colors={avatar.customColors || avatar.colors}
                        size={40}
                        type="user"
                        id={avatar.id}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{avatar.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{avatar.id}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {avatar.variant}
                          </Badge>
                          {avatar.customColors && (
                            <Badge variant="secondary" className="text-xs">
                              Custom Colors
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteAvatar(avatar.id, "user")}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Group Avatars */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Group Avatars ({avatars.groups.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {avatars.groups.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No group avatars found</p>
                ) : (
                  avatars.groups.map((avatar) => (
                    <div key={avatar.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Avatar
                        name={avatar.name}
                        variant={avatar.variant}
                        colors={avatar.customColors || avatar.colors}
                        size={40}
                        type="group"
                        id={avatar.id}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{avatar.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{avatar.id}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {avatar.variant}
                          </Badge>
                          {avatar.customColors && (
                            <Badge variant="secondary" className="text-xs">
                              Custom Colors
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteAvatar(avatar.id, "group")}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
