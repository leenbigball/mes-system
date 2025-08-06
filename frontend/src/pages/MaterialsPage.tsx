import { useState, useEffect } from 'react'
import { Plus, Trash2, Package } from 'lucide-react'
import { Switch } from '../components/ui/switch'

interface Material {
  id: string
  name: string
  type: 'raw_material' | 'semi_finished' | 'finished_good'
  stock: number
  status: 'enabled' | 'disabled'
  unit: string
  created_at: string
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'raw_material' as const,
    initial_stock: 0,
    unit: ''
  })

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8000/api/materials', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setMaterials(data)
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8000/api/materials', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        setFormData({ name: '', type: 'raw_material', initial_stock: 0, unit: '' })
        setShowCreateForm(false)
        fetchMaterials()
      } else {
        const error = await response.json()
        alert(error.detail || '创建物料失败')
      }
    } catch (error) {
      alert('创建物料失败')
    }
  }

  const handleUpdateStock = async (materialId: string, quantity: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8000/api/materials/${materialId}/stock`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity })
      })
      
      if (response.ok) {
        fetchMaterials()
      } else {
        alert('更新库存失败')
      }
    } catch (error) {
      alert('更新库存失败')
    }
  }

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('确定要删除这个物料吗？')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8000/api/materials/${materialId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        fetchMaterials()
      } else {
        alert('删除物料失败')
      }
    } catch (error) {
      alert('删除物料失败')
    }
  }

  const getTypeName = (type: string) => {
    const typeNames = {
      raw_material: '原料',
      semi_finished: '半成品',
      finished_good: '成品'
    }
    return typeNames[type as keyof typeof typeNames] || type
  }

  const getStatusName = (status: string) => {
    return status === 'enabled' ? '启用' : '禁用'
  }

  const getStatusColor = (status: string) => {
    return status === 'enabled' ? 'text-green-600' : 'text-red-600'
  }

  const handleToggleStatus = async (materialId: string, currentStatus: string) => {
    try {
      const token = localStorage.getItem('token')
      const newStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled'
      const response = await fetch(`http://localhost:8000/api/materials/${materialId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        fetchMaterials()
      } else {
        alert('更新物料状态失败')
      }
    } catch (error) {
      alert('更新物料状态失败')
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">物料管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            管理原料、半成品和成品的基础信息及库存
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建物料
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">创建新物料</h3>
          <form onSubmit={handleCreateMaterial} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">物料名称</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">物料类型</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="raw_material">原料</option>
                <option value="semi_finished">半成品</option>
                <option value="finished_good">成品</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">初始库存</label>
              <input
                type="number"
                min="0"
                required
                value={formData.initial_stock}
                onChange={(e) => setFormData({ ...formData, initial_stock: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">单位</label>
              <input
                type="text"
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                取消
              </button>
              <button
                type="submit"
                className="rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                创建
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
                      物料名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      库存
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      单位
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {materials.map((material) => (
                    <tr key={material.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {material.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getTypeName(material.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {material.stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {material.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={material.status === 'enabled'}
                            onCheckedChange={() => handleToggleStatus(material.id, material.status)}
                          />
                          <span className={getStatusColor(material.status)}>
                            {getStatusName(material.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => {
                            const quantity = prompt('请输入补库数量:')
                            if (quantity && !isNaN(Number(quantity))) {
                              handleUpdateStock(material.id, Number(quantity))
                            }
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Package className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(material.id)}
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
