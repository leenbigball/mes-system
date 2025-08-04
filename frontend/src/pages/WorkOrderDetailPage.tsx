import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, CheckSquare, User } from 'lucide-react'

interface WorkOrderDetail {
  id: string
  bom_id: string
  planned_quantity: number
  status: string
  operations: Array<{
    index: number
    name: string
    planned_output: number
    completed_output: number
    requires_inspection: boolean
    assigned_tasks: number
  }>
  bom: {
    name: string
    routing_id: string
    components: Array<{
      material_id: string
      quantity: number
      operation_index: number
    }>
  }
  routing: {
    name: string
    operations: Array<{
      name: string
      output_material_id: string
      output_quantity: number
      requires_inspection: boolean
    }>
  }
  production_tasks: Array<{
    id: string
    operation_index: number
    planned_output: number
    completed_output: number
    assigned_worker: string
    status: string
  }>
  inspection_tasks: Array<{
    id: string
    operation_index: number
    assigned_inspector: string
    status: string
  }>
}

interface User {
  id: string
  username: string
  role: string
}

interface ProductionLine {
  id: string
  name: string
  status: string
}

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [loading, setLoading] = useState(true)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showInspectionForm, setShowInspectionForm] = useState(false)
  const [taskFormData, setTaskFormData] = useState({
    operation_index: 0,
    planned_output: 1,
    assigned_worker: '',
    production_line_id: ''
  })
  const [inspectionFormData, setInspectionFormData] = useState({
    operation_index: 0,
    assigned_inspector: ''
  })

  useEffect(() => {
    if (id) {
      fetchWorkOrderDetail()
      fetchUsers()
      fetchProductionLines()
    }
  }, [id])

  const workers = useMemo(() => {
    return users.filter(user => user.role === 'worker')
  }, [users])

  const inspectors = useMemo(() => {
    return users.filter(user => user.role === 'inspector')
  }, [users])

  const fetchWorkOrderDetail = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`https://app-twlwzpul.fly.dev/api/work-orders/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setWorkOrder(data)
      }
    } catch (error) {
      console.error('Failed to fetch work order detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-twlwzpul.fly.dev/api/workers-inspectors', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchProductionLines = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-twlwzpul.fly.dev/api/production-lines', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setProductionLines(data)
      }
    } catch (error) {
      console.error('Failed to fetch production lines:', error)
    }
  }

  const handleCreateProductionTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-twlwzpul.fly.dev/api/production-tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          work_order_id: id,
          ...taskFormData
        })
      })
      
      if (response.ok) {
        setTaskFormData({
          operation_index: 0,
          planned_output: 1,
          assigned_worker: '',
          production_line_id: ''
        })
        setShowTaskForm(false)
        fetchWorkOrderDetail()
      } else {
        const error = await response.json()
        alert(error.detail || '创建生产任务失败')
      }
    } catch (error) {
      alert('创建生产任务失败')
    }
  }

  const handleAssignInspectionTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const inspectionTask = workOrder?.inspection_tasks.find(
        task => task.operation_index === inspectionFormData.operation_index
      )
      
      if (!inspectionTask) {
        alert('未找到对应的检验任务')
        return
      }
      
      const token = localStorage.getItem('token')
      const response = await fetch(`https://app-twlwzpul.fly.dev/api/inspection-tasks/${inspectionTask.id}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inspector_username: inspectionFormData.assigned_inspector
        })
      })
      
      if (response.ok) {
        setInspectionFormData({
          operation_index: 0,
          assigned_inspector: ''
        })
        setShowInspectionForm(false)
        fetchWorkOrderDetail()
      } else {
        const error = await response.json()
        alert(error.detail || '分配检验任务失败')
      }
    } catch (error) {
      alert('分配检验任务失败')
    }
  }


  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>
  }

  if (!workOrder) {
    return <div className="flex justify-center items-center h-64">工单不存在</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">工单详情</h1>
        <p className="mt-1 text-sm text-gray-600">
          工单ID: {workOrder.id}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">BOM</dt>
                <dd className="text-sm text-gray-900">{workOrder.bom.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">工艺路线</dt>
                <dd className="text-sm text-gray-900">{workOrder.routing.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">计划数量</dt>
                <dd className="text-sm text-gray-900">{workOrder.planned_quantity}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">状态</dt>
                <dd className="text-sm text-gray-900">{workOrder.status}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">工序进度</h3>
              <div className="space-x-2">
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  下发生产任务
                </button>
                <button
                  onClick={() => setShowInspectionForm(true)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  分配检验任务
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {workOrder.operations.map((operation, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">
                      工序 {index + 1}: {operation.name}
                    </h4>
                    {operation.requires_inspection && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        需要质检
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">计划产出:</span>
                      <span className="ml-2 font-medium">{operation.planned_output}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">完成产出:</span>
                      <span className="ml-2 font-medium">{operation.completed_output}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">已分配任务:</span>
                      <span className="ml-2 font-medium">{operation.assigned_tasks}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(operation.completed_output / operation.planned_output) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      进度: {Math.round((operation.completed_output / operation.planned_output) * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">生产任务</h3>
            <div className="space-y-3">
              {workOrder.production_tasks.map((task) => (
                <div key={task.id} className="border rounded p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      工序 {task.operation_index + 1}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    工人: {task.assigned_worker}
                  </p>
                  <p className="text-xs text-gray-500">
                    进度: {task.completed_output}/{task.planned_output}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">检验任务</h3>
            <div className="space-y-3">
              {workOrder.inspection_tasks.map((task) => (
                <div key={task.id} className="border rounded p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      工序 {task.operation_index + 1}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    质检员: {task.assigned_inspector}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showTaskForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">下发生产任务</h3>
            <form onSubmit={handleCreateProductionTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">工序</label>
                <select
                  value={taskFormData.operation_index}
                  onChange={(e) => setTaskFormData({ ...taskFormData, operation_index: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {workOrder.operations.map((op, index) => (
                    <option key={index} value={index}>
                      工序{index + 1}: {op.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">计划产出</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={taskFormData.planned_output}
                  onChange={(e) => setTaskFormData({ ...taskFormData, planned_output: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">分配工人</label>
                <select
                  required
                  value={taskFormData.assigned_worker}
                  onChange={(e) => setTaskFormData({ ...taskFormData, assigned_worker: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">选择工人</option>
                  {workers.map(worker => (
                    <option key={worker.id} value={worker.username}>{worker.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">产线</label>
                <select
                  required
                  value={taskFormData.production_line_id}
                  onChange={(e) => setTaskFormData({ ...taskFormData, production_line_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">选择产线</option>
                  {productionLines.map(line => (
                    <option key={line.id} value={line.id}>{line.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                  className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInspectionForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">分配检验任务</h3>
            <form onSubmit={handleAssignInspectionTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">工序</label>
                <select
                  value={inspectionFormData.operation_index}
                  onChange={(e) => setInspectionFormData({ ...inspectionFormData, operation_index: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {workOrder.operations.filter(op => op.requires_inspection).map((op) => {
                    const actualIndex = workOrder.operations.findIndex(o => o === op)
                    return (
                      <option key={actualIndex} value={actualIndex}>
                        工序{actualIndex + 1}: {op.name}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">分配质检员</label>
                <select
                  required
                  value={inspectionFormData.assigned_inspector}
                  onChange={(e) => setInspectionFormData({ ...inspectionFormData, assigned_inspector: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">选择质检员</option>
                  {inspectors.map(inspector => (
                    <option key={inspector.id} value={inspector.username}>{inspector.username}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInspectionForm(false)}
                  className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                >
                  分配
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
