'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ExcelImportSectionProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess?: () => void
}

export default function ExcelImportSection({ isOpen, onClose, onImportSuccess }: ExcelImportSectionProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    await handleFileUploadDirect(file)
  }

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Prevent default drag behavior on the whole window when section is open
  useEffect(() => {
    if (!isOpen) return

    const preventDefault = (e: DragEvent) => {
      if (isOpen) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('dragover', preventDefault)
    window.addEventListener('drop', preventDefault)

    return () => {
      window.removeEventListener('dragover', preventDefault)
      window.removeEventListener('drop', preventDefault)
    }
  }, [isOpen])

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    // Check if we're leaving the drop zone entirely
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX
    const y = event.clientY
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    
    const files = event.dataTransfer.files
    
    if (files && files.length > 0) {
      const file = files[0]
      
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        handleFileUploadDirect(file)
      } else {
        toast.error('请选择Excel文件 (.xlsx 或 .xls)')
      }
    }
  }

  const handleFileUploadDirect = async (file: File) => {
    setUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/excel/import', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setUploadResult(result.data)
        toast.success('Excel文件导入成功！')
        // Call the success callback to refresh the matches list
        if (onImportSuccess) {
          onImportSuccess()
        }
      } else {
        toast.error(`导入失败: ${result.error}`)
        setUploadResult({ error: result.error, ...result.data })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('上传失败，请稍后重试')
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Hidden file input - always rendered when component is open */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleFileUpload}
        style={{ display: 'none', position: 'absolute', left: '-9999px' }}
        aria-hidden="true"
      />
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Excel 导入</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">导入Excel数据</h3>
            <p className="text-muted-foreground mb-4">
              上传历史比赛Excel文件以批量导入比赛数据、球员参与信息和统计数据。
            </p>
            
            <div className="space-y-4">
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-primary bg-primary/5 scale-105' 
                    : 'border-border hover:border-primary'
                }`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  triggerFileUpload()
                }}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <FileSpreadsheet className={`h-12 w-12 mx-auto mb-3 ${
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className={`text-sm ${
                  isDragging ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}>
                  {isDragging ? '释放文件以上传' : '点击选择Excel文件或拖拽到此处'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  支持 .xlsx 和 .xls 格式
                </p>
              </div>
              
              <Button 
                onClick={(e) => {
                  e.preventDefault()
                  triggerFileUpload()
                }}
                disabled={uploading}
                className="w-full"
                type="button"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    选择Excel文件
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Upload Result Section */}
          {uploadResult && (
            <div className="space-y-4">
              {uploadResult.error ? (
                <div className="flex items-start gap-3 p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-destructive">导入失败</h4>
                    <p className="text-sm text-destructive/80 mt-1">{uploadResult.error}</p>
                    
                    {uploadResult.unknownPlayers && uploadResult.unknownPlayers.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium">未匹配的球员：</p>
                        <p className="text-sm text-muted-foreground">
                          {uploadResult.unknownPlayers.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 border border-green-200 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-green-800">导入成功</h4>
                    <div className="text-sm text-green-700 mt-2 space-y-1">
                      <p>对手球队: {uploadResult.match?.opponentTeam}</p>
                      <p>比分: {uploadResult.match?.ourScore} - {uploadResult.match?.opponentScore}</p>
                      <p>参与记录: {uploadResult.participations}条</p>
                      <p>事件记录: {uploadResult.events}条</p>
                      
                      {uploadResult.importSummary && (
                        <div className="mt-3 pt-2 border-t border-green-200">
                          <p>Excel总球员数: {uploadResult.importSummary.totalPlayersInExcel}</p>
                          <p>成功匹配: {uploadResult.importSummary.matchedPlayers}</p>
                          <p>已选择球员: {uploadResult.importSummary.selectedPlayers}</p>
                          <p>未匹配球员: {uploadResult.importSummary.unknownPlayers}</p>
                          <p>导入进球: {uploadResult.importSummary.goalsImported}</p>
                          <p>导入助攻: {uploadResult.importSummary.assistsImported}</p>
                          <p>计算系数: {uploadResult.importSummary.calculatedCoefficient?.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                    
                    {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                      <div className="mt-3 p-2 border border-yellow-200 bg-yellow-50 rounded">
                        <p className="text-sm font-medium text-yellow-800">注意事项:</p>
                        {uploadResult.warnings.map((warning: string, index: number) => (
                          <p key={index} className="text-sm text-yellow-700">{warning}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">使用说明</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Excel文件必须包含标准的比赛数据格式</li>
              <li>• 球员必须预先在系统中创建并设置shortId</li>
              <li>• 系统会根据shortId自动匹配球员</li>
              <li>• 未匹配的球员数据将被跳过但会在结果中显示</li>
              <li>• 导入成功后可在下方比赛列表中查看新导入的比赛</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  )
}