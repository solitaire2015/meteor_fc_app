'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Upload, X, User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  userName?: string
  onUploadSuccess?: (avatarUrl: string) => void
  onUploadError?: (error: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24', 
  lg: 'h-32 w-32'
}

export default function AvatarUpload({
  currentAvatarUrl,
  userName = 'User',
  onUploadSuccess,
  onUploadError,
  className = '',
  size = 'lg'
}: AvatarUploadProps) {
  const { data: session } = useSession()
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clear preview when currentAvatarUrl updates
  useEffect(() => {
    if (currentAvatarUrl && previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }, [currentAvatarUrl])

  const handleFileSelect = async (file: File) => {
    if (!session?.user?.id) {
      toast.error('请先登录')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过 2MB')
      return
    }

    // Show preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        toast.success('头像上传成功！')
        onUploadSuccess?.(result.data.url)
        // Keep preview until the parent component updates with the new URL
        // URL.revokeObjectURL(objectUrl)
        // setPreviewUrl(null)
      } else {
        throw new Error(result.error || '上传失败')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败，请稍后重试'
      toast.error(errorMessage)
      onUploadError?.(errorMessage)
      
      // Clear preview on error
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    
    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleDeleteAvatar = async () => {
    if (!session?.user?.id) {
      toast.error('请先登录')
      return
    }

    setUploading(true)
    try {
      const response = await fetch('/api/upload/avatar', {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success('头像删除成功！')
        onUploadSuccess?.(null)
      } else {
        throw new Error(result.error || '删除失败')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除失败，请稍后重试'
      toast.error(errorMessage)
      onUploadError?.(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  // Use preview if available, otherwise current avatar
  const displayAvatarUrl = previewUrl || currentAvatarUrl

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Avatar Display */}
      <div 
        className={`relative group cursor-pointer ${sizeClasses[size]}`}
        onClick={triggerFileUpload}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Avatar className={`${sizeClasses[size]} transition-all duration-200 group-hover:opacity-75`}>
          <AvatarImage 
            src={displayAvatarUrl || undefined} 
            alt={`${userName}的头像`}
          />
          <AvatarFallback className="bg-brand-blue text-white text-lg font-bold">
            {userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Upload Overlay */}
        <div className={`absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isDragging ? 'opacity-100 bg-brand-blue/50' : ''}`}>
          {uploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 border-2 border-dashed border-brand-blue rounded-full bg-brand-blue/20 flex items-center justify-center">
            <Upload className="h-6 w-6 text-brand-blue" />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          onClick={triggerFileUpload}
          disabled={uploading}
          size="sm"
          variant="outline"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
              上传中...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              上传头像
            </>
          )}
        </Button>

        {currentAvatarUrl && (
          <Button 
            onClick={handleDeleteAvatar}
            disabled={uploading}
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4 mr-2" />
            删除
          </Button>
        )}
      </div>

      {/* Upload Instructions */}
      <p className="text-xs text-muted-foreground text-center max-w-48">
        支持 JPG、PNG、WebP 格式<br />
        文件大小不超过 2MB<br />
        拖拽或点击上传
      </p>
    </div>
  )
}