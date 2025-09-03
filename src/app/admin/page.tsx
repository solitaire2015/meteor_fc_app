'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Minus, Mail, Phone, Target, Award, BarChart3, Edit, Save, X, Upload, Download } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Select from '@/components/shared/Select'
import styles from './admin.module.css'

interface User {
  id: string
  name: string
  shortId: string | null
  email: string | null
  phone: string | null
  userType: 'ADMIN' | 'PLAYER'
  accountStatus: 'GHOST' | 'CLAIMED'
  jerseyNumber: number | null
  position: 'GK' | 'DF' | 'MF' | 'FW' | null
  createdAt: string
  goals: number
  assists: number
  appearances: number
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showExcelSection, setShowExcelSection] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    shortId: '',
    email: '',
    phone: '',
    userType: 'PLAYER' as 'ADMIN' | 'PLAYER',
    accountStatus: 'GHOST' as 'GHOST' | 'CLAIMED',
    jerseyNumber: '',
    position: '' as 'GK' | 'DF' | 'MF' | 'FW' | ''
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    shortId: '',
    email: '',
    phone: '',
    userType: 'PLAYER' as 'ADMIN' | 'PLAYER',
    accountStatus: 'GHOST' as 'GHOST' | 'CLAIMED',
    jerseyNumber: '',
    position: '' as 'GK' | 'DF' | 'MF' | 'FW' | ''
  })

  useEffect(() => {
    fetchUsers()
    
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/players')
      const data = await response.json()
      if (data.success) {
        setUsers(data.data)
      } else {
        console.error('Failed to fetch users:', data.error)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const userData = {
      name: formData.name,
      shortId: formData.shortId || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      userType: formData.userType,
      accountStatus: formData.accountStatus,
      jerseyNumber: formData.jerseyNumber ? parseInt(formData.jerseyNumber) : undefined,
      position: formData.position || undefined
    }

    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })

      const data = await response.json()
      
      if (data.success) {
        setUsers([...users, { ...data.data, goals: 0, assists: 0, appearances: 0 }])
        setFormData({
          name: '',
          shortId: '',
          email: '',
          phone: '',
          userType: 'PLAYER',
          accountStatus: 'GHOST',
          jerseyNumber: '',
          position: ''
        })
        setShowCreateForm(false)
        toast.success('用户创建成功')
      } else {
        toast.error('创建用户失败: ' + data.error.message)
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('创建用户时发生错误')
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id)
    setEditFormData({
      name: user.name,
      shortId: user.shortId || '',
      email: user.email || '',
      phone: user.phone || '',
      userType: user.userType,
      accountStatus: user.accountStatus,
      jerseyNumber: user.jerseyNumber ? user.jerseyNumber.toString() : '',
      position: user.position || ''
    })
    
    // Use modal for mobile screens
    if (isMobile) {
      setShowEditModal(true)
    }
  }

  const handleCancelEdit = () => {
    setEditingUserId(null)
    setShowEditModal(false)
    setEditFormData({
      name: '',
      shortId: '',
      email: '',
      phone: '',
      userType: 'PLAYER',
      accountStatus: 'GHOST',
      jerseyNumber: '',
      position: ''
    })
  }

  const handleUpdateUser = async (userId: string) => {
    const userData = {
      name: editFormData.name,
      shortId: editFormData.shortId || undefined,
      email: editFormData.email || undefined,
      phone: editFormData.phone || undefined,
      userType: editFormData.userType,
      accountStatus: editFormData.accountStatus,
      jerseyNumber: editFormData.jerseyNumber ? parseInt(editFormData.jerseyNumber) : undefined,
      position: editFormData.position || undefined
    }

    try {
      const response = await fetch(`/api/players/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })

      const data = await response.json()
      
      if (data.success) {
        setUsers(users.map(user => 
          user.id === userId 
            ? { ...user, ...data.data }
            : user
        ))
        setEditingUserId(null)
        setShowEditModal(false)
        toast.success('用户信息更新成功')
      } else {
        toast.error('更新用户失败: ' + data.error.message)
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('更新用户时发生错误')
    }
  }

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('请选择Excel文件 (.xlsx 或 .xls)')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/admin/excel/import', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Excel导入成功！导入了${data.data.participations}个参与记录和${data.data.events}个事件`)
        
        // Show import summary
        const summary = data.data.importSummary
        toast.success(`匹配球员: ${summary.matchedPlayers}/${summary.totalPlayersInExcel}，进球: ${summary.goalsImported}，助攻: ${summary.assistsImported}`, {
          duration: 5000
        })
        
        // Show warnings for unmatched players
        if (data.data.warnings && data.data.warnings.length > 0) {
          data.data.warnings.forEach((warning: string) => {
            toast.error(warning, {
              duration: 10000
            })
          })
        }
      } else {
        toast.error(`导入失败: ${data.error}`)
      }
    } catch (error) {
      console.error('Excel upload error:', error)
      toast.error('Excel上传失败，请检查文件格式')
    } finally {
      setUploading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Toaster position="top-center" />
      <header className={styles.header}>
        <h1>管理后台</h1>
        <div className={styles.headerActions}>
          <a href="/admin/matches" className={styles.navLink}>
            <Calendar size={16} />
            比赛管理
          </a>
          <button 
            className={styles.navLink}
            onClick={() => setShowExcelSection(!showExcelSection)}
          >
            {showExcelSection ? <X size={16} /> : <Upload size={16} />}
            {showExcelSection ? '关闭' : 'Excel导入导出'}
          </button>
          <button 
            className={styles.createButton}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? <Minus size={16} /> : <Plus size={16} />}
            {showCreateForm ? '取消' : '创建新用户'}
          </button>
        </div>
      </header>

      {showCreateForm && (
        <div className={styles.createForm}>
          <h2>创建新用户</h2>
          <form onSubmit={handleCreateUser}>
            <div className={styles.formGroup}>
              <label>姓名 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>短ID (用于Excel导入识别)</label>
              <input
                type="text"
                value={formData.shortId}
                onChange={(e) => setFormData({...formData, shortId: e.target.value})}
                placeholder="例如: dh, qc, ma"
                maxLength={4}
              />
              <small style={{color: '#6b7280', fontSize: '12px'}}>
                用于Excel导入时识别球员，建议使用2-4个字符
              </small>
            </div>

            <div className={styles.formGroup}>
              <label>邮箱</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label>手机号</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <Select
                  label="用户类型"
                  value={formData.userType}
                  onChange={(value) => setFormData({...formData, userType: value as 'ADMIN' | 'PLAYER'})}
                  options={[
                    { value: 'PLAYER', label: '球员' },
                    { value: 'ADMIN', label: '管理员' }
                  ]}
                />
              </div>

              <div className={styles.formGroup}>
                <Select
                  label="账户状态"
                  value={formData.accountStatus}
                  onChange={(value) => setFormData({...formData, accountStatus: value as 'GHOST' | 'CLAIMED'})}
                  options={[
                    { value: 'GHOST', label: '幽灵账户' },
                    { value: 'CLAIMED', label: '已认领' }
                  ]}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>球衣号码</label>
                <input
                  type="number"
                  value={formData.jerseyNumber}
                  onChange={(e) => setFormData({...formData, jerseyNumber: e.target.value})}
                  min="1"
                  max="99"
                />
              </div>

              <div className={styles.formGroup}>
                <Select
                  label="位置"
                  value={formData.position}
                  onChange={(value) => setFormData({...formData, position: value as 'GK' | 'DF' | 'MF' | 'FW'})}
                  placeholder="选择位置"
                  options={[
                    { value: 'GK', label: '门将' },
                    { value: 'DF', label: '后卫' },
                    { value: 'MF', label: '中场' },
                    { value: 'FW', label: '前锋' }
                  ]}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.submitButton}>
                创建用户
              </button>
            </div>
          </form>
        </div>
      )}

      {showExcelSection && (
        <div className={styles.createForm}>
          <h2>Excel 导入导出</h2>
          <p className={styles.sectionDescription}>
            上传历史比赛Excel文件以批量导入数据，或导出现有比赛数据到Excel格式。
          </p>
          
          <div className={styles.excelActions}>
            <div className={styles.uploadSection}>
              <h3>导入Excel文件</h3>
              <p className={styles.uploadDescription}>
                支持导入比赛数据，包括出勤记录、费用信息和进球助攻统计。确保Excel文件格式正确且球员姓名已在系统中注册。
              </p>
              <div className={styles.uploadArea}>
                <input
                  type="file"
                  id="excel-upload"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                <label 
                  htmlFor="excel-upload" 
                  className={`${styles.uploadButton} ${uploading ? styles.uploading : ''}`}
                >
                  <Upload size={20} />
                  {uploading ? '上传中...' : '选择Excel文件'}
                </label>
                <div className={styles.uploadHint}>
                  支持 .xlsx 和 .xls 格式
                </div>
              </div>
            </div>

            <div className={styles.downloadSection}>
              <h3>导出比赛数据</h3>
              <p className={styles.downloadDescription}>
                将比赛数据导出为Excel格式，便于备份或外部分析。
              </p>
              <div className={styles.downloadHint}>
                请先前往"比赛管理"页面，在具体比赛详情中可以导出该场比赛的Excel文件。
              </div>
            </div>
          </div>

          <div className={styles.excelInfo}>
            <h3>使用说明</h3>
            <ul>
              <li><strong>导入前准备：</strong>确保所有球员已在系统中创建，且系统会为每个球员生成唯一的短ID（如"东辉"→"dh"）</li>
              <li><strong>Excel格式：</strong>支持标准的比赛记录格式，包含出勤数据、费用信息和进球助攻记录</li>
              <li><strong>冲突处理：</strong>如果发现未知球员，系统会显示警告信息，请先创建相应球员后重新导入</li>
              <li><strong>数据验证：</strong>导入后可对比计算结果，验证费用计算逻辑的准确性</li>
            </ul>
          </div>
        </div>
      )}

      {/* Edit Modal for Mobile */}
      {showEditModal && (
        <div className={styles.modalOverlay} onClick={handleCancelEdit}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>编辑用户信息</h3>
              <button 
                className={styles.modalCloseButton}
                onClick={handleCancelEdit}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label>姓名 *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>短ID (用于Excel导入识别)</label>
                <input
                  type="text"
                  value={editFormData.shortId}
                  onChange={(e) => setEditFormData({...editFormData, shortId: e.target.value})}
                  placeholder="例如: dh01, lc01, xb01"
                  maxLength={4}
                />
                <small style={{color: '#6b7280', fontSize: '12px'}}>
                  用于Excel导入时识别球员，建议使用2-4个字符
                </small>
              </div>

              <div className={styles.formGroup}>
                <label>邮箱</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                />
              </div>

              <div className={styles.formGroup}>
                <label>手机号</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <Select
                    label="用户类型"
                    value={editFormData.userType}
                    onChange={(value) => setEditFormData({...editFormData, userType: value as 'ADMIN' | 'PLAYER'})}
                    options={[
                      { value: 'PLAYER', label: '球员' },
                      { value: 'ADMIN', label: '管理员' }
                    ]}
                  />
                </div>

                <div className={styles.formGroup}>
                  <Select
                    label="账户状态"
                    value={editFormData.accountStatus}
                    onChange={(value) => setEditFormData({...editFormData, accountStatus: value as 'GHOST' | 'CLAIMED'})}
                    options={[
                      { value: 'GHOST', label: '幽灵账户' },
                      { value: 'CLAIMED', label: '已认领' }
                    ]}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>球衣号码</label>
                  <input
                    type="number"
                    value={editFormData.jerseyNumber}
                    onChange={(e) => setEditFormData({...editFormData, jerseyNumber: e.target.value})}
                    min="1"
                    max="99"
                  />
                </div>

                <div className={styles.formGroup}>
                  <Select
                    label="位置"
                    value={editFormData.position}
                    onChange={(value) => setEditFormData({...editFormData, position: value as 'GK' | 'DF' | 'MF' | 'FW'})}
                    placeholder="选择位置"
                    options={[
                      { value: 'GK', label: '门将' },
                      { value: 'DF', label: '后卫' },
                      { value: 'MF', label: '中场' },
                      { value: 'FW', label: '前锋' }
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={handleCancelEdit}
                className={styles.cancelModalButton}
              >
                取消
              </button>
              <button
                onClick={() => editingUserId && handleUpdateUser(editingUserId)}
                className={styles.saveModalButton}
              >
                保存更改
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.usersList}>
        <h2>用户列表 ({users.length})</h2>
        
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>姓名</th>
                <th>短ID</th>
                <th>类型</th>
                <th>状态</th>
                <th>球衣号</th>
                <th>位置</th>
                <th>联系方式</th>
                <th>统计</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={10} className={styles.emptyState}>
                    暂无用户数据
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    {editingUserId === user.id && !isMobile ? (
                      <>
                        <td className={styles.nameCell}>
                          <input
                            type="text"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                            className={styles.editInput}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editFormData.shortId}
                            onChange={(e) => setEditFormData({...editFormData, shortId: e.target.value})}
                            className={styles.editInput}
                            placeholder="dh01"
                            maxLength={4}
                          />
                        </td>
                        <td>
                          <Select
                            value={editFormData.userType}
                            onChange={(value) => setEditFormData({...editFormData, userType: value as 'ADMIN' | 'PLAYER'})}
                            options={[
                              { value: 'PLAYER', label: '球员' },
                              { value: 'ADMIN', label: '管理员' }
                            ]}
                            className={styles.editSelect}
                          />
                        </td>
                        <td>
                          <Select
                            value={editFormData.accountStatus}
                            onChange={(value) => setEditFormData({...editFormData, accountStatus: value as 'GHOST' | 'CLAIMED'})}
                            options={[
                              { value: 'GHOST', label: '幽灵' },
                              { value: 'CLAIMED', label: '已认领' }
                            ]}
                            className={styles.editSelect}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={editFormData.jerseyNumber}
                            onChange={(e) => setEditFormData({...editFormData, jerseyNumber: e.target.value})}
                            min="1"
                            max="99"
                            className={styles.editInput}
                          />
                        </td>
                        <td>
                          <Select
                            value={editFormData.position}
                            onChange={(value) => setEditFormData({...editFormData, position: value as 'GK' | 'DF' | 'MF' | 'FW'})}
                            placeholder="选择位置"
                            options={[
                              { value: 'GK', label: '门将' },
                              { value: 'DF', label: '后卫' },
                              { value: 'MF', label: '中场' },
                              { value: 'FW', label: '前锋' }
                            ]}
                            className={styles.editSelect}
                          />
                        </td>
                        <td className={styles.contactCell}>
                          <input
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                            placeholder="邮箱"
                            className={styles.editInput}
                          />
                          <input
                            type="tel"
                            value={editFormData.phone}
                            onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                            placeholder="手机号"
                            className={styles.editInput}
                          />
                        </td>
                        <td className={styles.statsCell}>
                          <div><Target size={14} style={{display: 'inline', marginRight: '6px'}} />{user.goals}</div>
                          <div><Award size={14} style={{display: 'inline', marginRight: '6px'}} />{user.assists}</div>
                          <div><BarChart3 size={14} style={{display: 'inline', marginRight: '6px'}} />{user.appearances}</div>
                        </td>
                        <td className={styles.dateCell}>
                          {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                        </td>
                        <td className={styles.actionsCell}>
                          <div className={styles.actionButtons}>
                            <button
                              onClick={() => handleUpdateUser(user.id)}
                              className={`${styles.actionButton} ${styles.saveButton}`}
                              title="保存"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className={`${styles.actionButton} ${styles.cancelButton}`}
                              title="取消"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={styles.nameCell}>
                          <strong>{user.name}</strong>
                        </td>
                        <td>
                          <span className={user.shortId ? styles.shortIdDisplay : styles.shortIdMissing}>
                            {user.shortId || '未设置'}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${styles[user.userType.toLowerCase()]}`}>
                            {user.userType === 'ADMIN' ? '管理员' : '球员'}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${styles[user.accountStatus.toLowerCase()]}`}>
                            {user.accountStatus === 'GHOST' ? '幽灵' : '已认领'}
                          </span>
                        </td>
                        <td>{user.jerseyNumber || '-'}</td>
                        <td>{user.position || '-'}</td>
                        <td className={styles.contactCell}>
                          {user.email && <div><Mail size={14} style={{display: 'inline', marginRight: '6px'}} />{user.email}</div>}
                          {user.phone && <div><Phone size={14} style={{display: 'inline', marginRight: '6px'}} />{user.phone}</div>}
                          {!user.email && !user.phone && '-'}
                        </td>
                        <td className={styles.statsCell}>
                          <div><Target size={14} style={{display: 'inline', marginRight: '6px'}} />{user.goals}</div>
                          <div><Award size={14} style={{display: 'inline', marginRight: '6px'}} />{user.assists}</div>
                          <div><BarChart3 size={14} style={{display: 'inline', marginRight: '6px'}} />{user.appearances}</div>
                        </td>
                        <td className={styles.dateCell}>
                          {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                        </td>
                        <td className={styles.actionsCell}>
                          <button
                            onClick={() => handleEditUser(user)}
                            className={`${styles.actionButton} ${styles.editButton}`}
                            title="编辑"
                          >
                            <Edit size={16} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}