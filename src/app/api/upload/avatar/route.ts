import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadFile, extractFileKeyFromUrl } from '@/lib/aws'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Get current user data to check for existing avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true }
    })

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Extract existing file key if there's an avatar
    const existingFileKey = currentUser.avatarUrl 
      ? extractFileKeyFromUrl(currentUser.avatarUrl) 
      : undefined

    // Upload new avatar
    const { url, fileKey } = await uploadFile(
      file, 
      session.user.id, 
      'avatar',
      existingFileKey || undefined
    )

    // Update user avatar in database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        avatarUrl: url,
        avatarFileKey: fileKey
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        avatarFileKey: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        user: updatedUser,
        url,
        fileKey
      }
    })

  } catch (error) {
    console.error('Avatar upload error:', error)
    
    // Return user-friendly error messages
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message.includes('文件大小') || error.message.includes('只支持') 
            ? error.message 
            : '头像上传失败，请稍后重试' 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true, avatarFileKey: true }
    })

    if (!currentUser?.avatarUrl) {
      return NextResponse.json(
        { success: false, error: '没有头像可删除' },
        { status: 400 }
      )
    }

    // Delete from S3 if we have the file key
    if (currentUser.avatarFileKey) {
      const { deleteFromS3 } = await import('@/lib/aws')
      try {
        await deleteFromS3(currentUser.avatarFileKey)
      } catch (error) {
        console.warn('Failed to delete avatar from S3:', error)
        // Continue with database update even if S3 deletion fails
      }
    }

    // Update user to remove avatar
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        avatarUrl: null,
        avatarFileKey: null
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true
      }
    })

    return NextResponse.json({
      success: true,
      data: { user: updatedUser }
    })

  } catch (error) {
    console.error('Avatar deletion error:', error)
    return NextResponse.json(
      { success: false, error: '删除头像失败，请稍后重试' },
      { status: 500 }
    )
  }
}