import { useState, useEffect } from 'react'
import { Plus, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'

interface BOM {
  id: string
  name: string
  routing_id: string
}

interface WorkOrder {
  id: string
  bom_id: string
  planned_quantity: number
  status: 'created' | 'in_progress' | 'completed'
  operations: Array<{
    index: number
    name: string
    planned_output: number
    completed_output: number
    requires_inspection: boolean
  }>
  created_at: string
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [boms, setBOMs] = useState<BOM[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    bom_id: '',
    planned_quantity: 1
  })

  useEffect(() => {
    fetchWorkOrders()
    fetchBOMs()
  }, [])

  const fetchWorkOrders = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-npkmklju.fly.dev/api/work-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setWorkOrders(data)
      }
    } catch (error) {
      console.error('Failed to fetch work orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBOMs = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-npkmklju.fly.dev/api/boms', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setBOMs(data)
      }
    } catch (error) {
      console.error('Failed to fetch BOMs:', error)
    }
  }

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-npkmklju.fly.dev/api/work-orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        setFormData({ bom_id: '', planned_quantity: 1 })
        setShowCreateForm(false)
        fetchWorkOrders()
      } else {
        const error = await response.json()
        alert(error.detail || '创建工单失败')
      }
    } catch (error) {
      alert('创建工单失败')
    }
  }

  const getStatusName = (status: string) => {
    const statusNames = {
      created: '已创建',
      in_progress: '执行中',
      completed: '已完成'
    }
    return statusNames[status as keyof typeof statusNames] || status
  }

  const getStatusColor = (status: string) => {
    const statusColors = {
      created: 'text-gray-600 bg-gray-100',
      in_progress: 'text-yellow-600 bg-yellow-100',
      completed: 'text-green-600 bg-green-100'
    }
    return statusColors[status as keyof typeof statusColors] || 'text-gray-600 bg-gray-100'
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">工单管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            创建和管理生产工单
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建工单
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">创建新工单</h3>
          <form onSubmit={handleCreateWorkOrder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">BOM</label>
              <select
                required
                value={formData.bom_id}
                onChange={(e) => setFormData({ ...formData, bom_id: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">选择BOM</option>
                {boms.map(bom => (
                  <option key={bom.id} value={bom.id}>{bom.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">计划数量</label>
              <input
                type="number"
                min="1"
                required
                value={formData.planned_quantity}
                onChange={(e) => setFormData({ ...formData, planned_quantity: parseInt(e.target.value) })}
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
                      工单ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      BOM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      计划数量
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
                  {workOrders.map((workOrder) => {
                    const bom = boms.find(b => b.id === workOrder.bom_id)
                    return (
                      <tr key={workOrder.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {workOrder.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bom?.name || '未知'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {workOrder.planned_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(workOrder.status)}`}>
                            {getStatusName(workOrder.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(workOrder.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/work-orders/${workOrder.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
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
