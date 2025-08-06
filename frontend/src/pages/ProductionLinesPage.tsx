import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Circle } from 'lucide-react'

interface ProductionLine {
  id: string
  name: string
  status: 'idle' | 'busy'
  created_at: string
}

export default function ProductionLinesPage() {
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null)
  const [formData, setFormData] = useState({
    name: ''
  })

  useEffect(() => {
    fetchLines()
  }, [])

  const fetchLines = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-npkmklju.fly.dev/api/production-lines', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setLines(data)
      }
    } catch (error) {
      console.error('Failed to fetch production lines:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLine = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-npkmklju.fly.dev/api/production-lines', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        setFormData({ name: '' })
        setShowCreateForm(false)
        fetchLines()
      } else {
        const error = await response.json()
        alert(error.detail || '创建产线失败')
      }
    } catch (error) {
      alert('创建产线失败')
    }
  }

  const handleUpdateLine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLine) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`https://app-npkmklju.fly.dev/api/production-lines/${editingLine.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        setFormData({ name: '' })
        setEditingLine(null)
        fetchLines()
      } else {
        alert('更新产线失败')
      }
    } catch (error) {
      alert('更新产线失败')
    }
  }

  const handleDeleteLine = async (lineId: string) => {
    if (!confirm('确定要删除这个产线吗？')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`https://app-npkmklju.fly.dev/api/production-lines/${lineId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        fetchLines()
      } else {
        alert('删除产线失败')
      }
    } catch (error) {
      alert('删除产线失败')
    }
  }

  const getStatusName = (status: string) => {
    return status === 'idle' ? '空闲' : '繁忙'
  }

  const getStatusColor = (status: string) => {
    return status === 'idle' ? 'text-green-600' : 'text-red-600'
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">产线管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            管理生产线的基础信息和状态
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建产线
          </button>
        </div>
      </div>

      {(showCreateForm || editingLine) && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingLine ? '编辑产线' : '创建新产线'}
          </h3>
          <form onSubmit={editingLine ? handleUpdateLine : handleCreateLine} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">产线名称</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setEditingLine(null)
                  setFormData({ name: '' })
                }}
                className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                取消
              </button>
              <button
                type="submit"
                className="rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {editingLine ? '更新' : '创建'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      产线名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {line.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <Circle className={`h-3 w-3 mr-2 ${getStatusColor(line.status)}`} fill="currentColor" />
                          <span className={getStatusColor(line.status)}>
                            {getStatusName(line.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(line.created_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => {
                            setEditingLine(line)
                            setFormData({ name: line.name })
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLine(line.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
