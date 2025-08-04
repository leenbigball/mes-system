import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface Material {
  id: string
  name: string
  type: 'raw_material' | 'semi_finished' | 'finished_good'
}

interface Routing {
  id: string
  name: string
  finished_product_id: string
  operations: Array<{
    name: string
    output_material_id: string
    output_quantity: number
    requires_inspection: boolean
  }>
}

interface BOMComponent {
  material_id: string
  quantity: number
  operation_index: number
}

interface BOM {
  id: string
  name: string
  routing_id: string
  components: BOMComponent[]
  created_at: string
}

export default function BOMsPage() {
  const [boms, setBOMs] = useState<BOM[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [routings, setRoutings] = useState<Routing[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    routing_id: '',
    components: [{ material_id: '', quantity: 1, operation_index: 0 }]
  })

  const rawMaterials = materials.filter(m => m.type === 'raw_material')

  useEffect(() => {
    fetchBOMs()
    fetchMaterials()
    fetchRoutings()
  }, [])

  const fetchBOMs = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-twlwzpul.fly.dev/api/boms', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setBOMs(data)
      }
    } catch (error) {
      console.error('Failed to fetch BOMs:', error)
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
    }
  }

  const addComponent = () => {
    setFormData({
      ...formData,
      components: [...formData.components, { material_id: '', quantity: 1, operation_index: 0 }]
    })
  }

  const removeComponent = (index: number) => {
    if (formData.components.length > 1) {
      const newComponents = formData.components.filter((_, i) => i !== index)
      setFormData({ ...formData, components: newComponents })
    }
  }

  const updateComponent = (index: number, field: string, value: any) => {
    const newComponents = [...formData.components]
    newComponents[index] = { ...newComponents[index], [field]: value }
    setFormData({ ...formData, components: newComponents })
  }

  const handleCreateBOM = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-twlwzpul.fly.dev/api/boms', {
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
          routing_id: '',
          components: [{ material_id: '', quantity: 1, operation_index: 0 }]
        })
        setShowCreateForm(false)
        fetchBOMs()
      } else {
        const error = await response.json()
        alert(error.detail || '创建BOM失败')
      }
    } catch (error) {
      alert('创建BOM失败')
    }
  }

  const handleDeleteBOM = async (bomId: string) => {
    if (!confirm('确定要删除这个BOM吗？')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`https://app-twlwzpul.fly.dev/api/boms/${bomId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        fetchBOMs()
      } else {
        alert('删除BOM失败')
      }
    } catch (error) {
      alert('删除BOM失败')
    }
  }

  const selectedRouting = routings.find(r => r.id === formData.routing_id)

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">物料清单管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            管理产品的原料配方和投料工序
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建BOM
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">创建新BOM</h3>
          <form onSubmit={handleCreateBOM} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">BOM名称</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">工艺路线</label>
              <select
                required
                value={formData.routing_id}
                onChange={(e) => setFormData({ ...formData, routing_id: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">选择工艺路线</option>
                {routings.map(routing => (
                  <option key={routing.id} value={routing.id}>{routing.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">原料组件</label>
              {formData.components.map((component, index) => (
                <div key={index} className="border rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-900">组件 {index + 1}</h4>
                    {formData.components.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeComponent(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">原料</label>
                      <select
                        required
                        value={component.material_id}
                        onChange={(e) => updateComponent(index, 'material_id', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="">选择原料</option>
                        {rawMaterials.map(material => (
                          <option key={material.id} value={material.id}>{material.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">数量</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={component.quantity}
                        onChange={(e) => updateComponent(index, 'quantity', parseInt(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">投料工序</label>
                      <select
                        required
                        value={component.operation_index}
                        onChange={(e) => updateComponent(index, 'operation_index', parseInt(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        {selectedRouting?.operations.map((operation, opIndex) => (
                          <option key={opIndex} value={opIndex}>
                            工序{opIndex + 1}: {operation.name}
                          </option>
                        )) || <option value={0}>工序1</option>}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addComponent}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加组件
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
                      BOM名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      工艺路线
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      组件数量
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
                  {boms.map((bom) => {
                    const routing = routings.find(r => r.id === bom.routing_id)
                    return (
                      <tr key={bom.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bom.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {routing?.name || '未知'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bom.components.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(bom.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteBOM(bom.id)}
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
