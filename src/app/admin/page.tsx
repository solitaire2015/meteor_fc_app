'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Minus, Mail, Phone, Target, Award, BarChart3 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import styles from './admin.module.css'

interface User {
  id: string
  name: string
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    userType: 'PLAYER' as 'ADMIN' | 'PLAYER',
    accountStatus: 'GHOST' as 'GHOST' | 'CLAIMED',
    jerseyNumber: '',
    position: '' as 'GK' | 'DF' | 'MF' | 'FW' | ''
  })

  useEffect(() => {
    fetchUsers()
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
          email: '',
          phone: '',
          userType: 'PLAYER',
          accountStatus: 'GHOST',
          jerseyNumber: '',
          position: ''
        })
        setShowCreateForm(false)
      } else {
        alert('创建用户失败: ' + data.error.message)
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert('创建用户时发生错误')
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
                <label>用户类型</label>
                <select
                  value={formData.userType}
                  onChange={(e) => setFormData({...formData, userType: e.target.value as 'ADMIN' | 'PLAYER'})}
                >
                  <option value="PLAYER">球员</option>
                  <option value="ADMIN">管理员</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>账户状态</label>
                <select
                  value={formData.accountStatus}
                  onChange={(e) => setFormData({...formData, accountStatus: e.target.value as 'GHOST' | 'CLAIMED'})}
                >
                  <option value="GHOST">幽灵账户</option>
                  <option value="CLAIMED">已认领</option>
                </select>
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
                <label>位置</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value as 'GK' | 'DF' | 'MF' | 'FW'})}
                >
                  <option value="">选择位置</option>
                  <option value="GK">门将</option>
                  <option value="DF">后卫</option>
                  <option value="MF">中场</option>
                  <option value="FW">前锋</option>
                </select>
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

      <div className={styles.usersList}>
        <h2>用户列表 ({users.length})</h2>
        
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>姓名</th>
                <th>类型</th>
                <th>状态</th>
                <th>球衣号</th>
                <th>位置</th>
                <th>联系方式</th>
                <th>统计</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    暂无用户数据
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className={styles.nameCell}>
                      <strong>{user.name}</strong>
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