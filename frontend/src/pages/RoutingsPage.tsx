import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react'

interface Material {
  id: string
  name: string
  type: 'raw_material' | 'semi_finished' | 'finished_good'
}

interface Operation {
  name: string
  output_material_id: string
  output_quantity: number
  requires_inspection: boolean
}

interface Routing {
  id: string
  name: string
  finished_product_id: string
  operations: Operation[]
  created_at: string
}

export default function RoutingsPage() {
  const [routings, setRoutings] = useState<Routing[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    finished_product_id: '',
    operations: [{ name: '', output_material_id: '', output_quantity: 1, requires_inspection: false }]
  })

  const finishedGoods = materials.filter(m => m.type === 'finished_good')
  const semiFinished = materials.filter(m => m.type === 'semi_finished')

  useEffect(() => {
    fetchRoutings()
    fetchMaterials()
  }, [])

  const fetchRoutings = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-twlwzpul.fly.dev/api/routings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setRoutings(data)
      }
    } catch (error) {
      console.error('Failed to fetch routings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-twlwzpul.fly.dev/api/materials', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setMaterials(data)
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error)
    }
  }

  const addOperation = () => {
    setFormData({
      ...formData,
      operations: [...formData.operations, { name: '', output_material_id: '', output_quantity: 1, requires_inspection: false }]
    })
  }

  const removeOperation = (index: number) => {
    if (formData.operations.length > 1) {
      const newOperations = formData.operations.filter((_, i) => i !== index)
      setFormData({ ...formData, operations: newOperations })
    }
  }

  const updateOperation = (index: number, field: string, value: any) => {
    const newOperations = [...formData.operations]
    newOperations[index] = { ...newOperations[index], [field]: value }
    setFormData({ ...formData, operations: newOperations })
  }

  const handleCreateRouting = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-twlwzpul.fly.dev/api/routings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        setFormData({
          name: '',
          finished_product_id: '',
          operations: [{ name: '', output_material_id: '', output_quantity: 1, requires_inspection: false }]
        })
        setShowCreateForm(false)
        fetchRoutings()
      } else {
        const error = await response.json()
        alert(error.detail || '创建工艺路线失败')
      }
    } catch (error) {
      alert('创建工艺路线失败')
    }
  }

  const handleDeleteRouting = async (routingId: string) => {
    if (!confirm('确定要删除这个工艺路线吗？')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`https://app-twlwzpul.fly.dev/api/routings/${routingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        fetchRoutings()
      } else {
        alert('删除工艺路线失败')
      }
    } catch (error) {
      alert('删除工艺路线失败')
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">工艺路线管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            管理产品的生产工艺流程和工序
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建工艺路线
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">创建新工艺路线</h3>
          <form onSubmit={handleCreateRouting} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">路线名称</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">成品</label>
              <select
                required
                value={formData.finished_product_id}
                onChange={(e) => {
                  const newFormData = { ...formData, finished_product_id: e.target.value }
                  const lastOpIndex = newFormData.operations.length - 1
                  newFormData.operations[lastOpIndex].output_material_id = e.target.value
                  newFormData.operations[lastOpIndex].output_quantity = 1
                  setFormData(newFormData)
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">选择成品</option>
                {finishedGoods.map(material => (
                  <option key={material.id} value={material.id}>{material.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">工序</label>
              {formData.operations.map((operation, index) => (
                <div key={index} className="border rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-900">工序 {index + 1}</h4>
                    {formData.operations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOperation(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">工序名称</label>
                      <input
                        type="text"
                        required
                        value={operation.name}
                        onChange={(e) => updateOperation(index, 'name', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">产出物料</label>
                      <select
                        required
                        value={operation.output_material_id}
                        onChange={(e) => updateOperation(index, 'output_material_id', e.target.value)}
                        disabled={index === formData.operations.length - 1}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                      >
                        <option value="">选择物料</option>
                        {index === formData.operations.length - 1 ? (
                          finishedGoods.map(material => (
                            <option key={material.id} value={material.id}>{material.name}</option>
                          ))
                        ) : (
                          semiFinished.map(material => (
                            <option key={material.id} value={material.id}>{material.name}</option>
                          ))
                        )}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">产出数量</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={operation.output_quantity}
                        onChange={(e) => updateOperation(index, 'output_quantity', parseInt(e.target.value))}
                        disabled={index === formData.operations.length - 1}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => updateOperation(index, 'requires_inspection', !operation.requires_inspection)}
                        className="flex items-center text-sm text-gray-700"
                      >
                        {operation.requires_inspection ? (
                          <CheckSquare className="h-4 w-4 mr-2 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 mr-2 text-gray-400" />
                        )}
                        需要质检
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addOperation}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加工序
              </button>
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
                      路线名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      成品
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      工序数量
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
                  {routings.map((routing) => {
                    const finishedProduct = materials.find(m => m.id === routing.finished_product_id)
                    return (
                      <tr key={routing.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {routing.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {finishedProduct?.name || '未知'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {routing.operations.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(routing.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteRouting(routing.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
