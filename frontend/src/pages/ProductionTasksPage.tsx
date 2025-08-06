import { useState, useEffect } from 'react'
import { Play, Package, CheckCircle, RefreshCw } from 'lucide-react'

interface ProductionTask {
  id: string
  work_order_id: string
  operation_index: number
  operation_name: string
  planned_output: number
  completed_output: number
  assigned_worker: string
  production_line_id: string
  production_line_name: string
  status: 'not_started' | 'in_progress' | 'completed'
  material_requirements: Array<{
    material_id: string
    material_name: string
    required_quantity: number
    fed_quantity: number
  }>
  created_at: string
}

export default function ProductionTasksPage() {
  const [tasks, setTasks] = useState<ProductionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'not_started' | 'in_progress' | 'completed'>('in_progress')
  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null)
  const [feedingMaterial, setFeedingMaterial] = useState({ materialId: '', quantity: 0 })
  const [reportingQuantity, setReportingQuantity] = useState(0)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-npkmklju.fly.dev/api/production-tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Failed to fetch production tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`https://app-npkmklju.fly.dev/api/production-tasks/${taskId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        fetchTasks()
      } else {
        const error = await response.json()
        alert(error.detail || '启动任务失败')
      }
    } catch (error) {
      alert('启动任务失败')
    }
  }

  const handleFeedMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`https://app-npkmklju.fly.dev/api/production-tasks/${selectedTask.id}/feed-material`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          material_id: feedingMaterial.materialId,
          quantity: feedingMaterial.quantity
        })
      })
      
      if (response.ok) {
        setFeedingMaterial({ materialId: '', quantity: 0 })
        fetchTasks()
        const updatedResponse = await fetch(`https://app-npkmklju.fly.dev/api/production-tasks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (updatedResponse.ok) {
          const updatedTasks = await updatedResponse.json()
          const updatedTask = updatedTasks.find((t: ProductionTask) => t.id === selectedTask.id)
          if (updatedTask) setSelectedTask(updatedTask)
        }
      } else {
        const error = await response.json()
        alert(error.detail || '投料失败')
      }
    } catch (error) {
      alert('投料失败')
    }
  }

  const handleReportProduction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`https://app-npkmklju.fly.dev/api/production-tasks/${selectedTask.id}/report-production`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          output_quantity: reportingQuantity
        })
      })
      
      if (response.ok) {
        setReportingQuantity(0)
        setSelectedTask(null)
        fetchTasks()
      } else {
        const error = await response.json()
        alert(error.detail || '报工失败')
      }
    } catch (error) {
      alert('报工失败')
    }
  }

  const getStatusName = (status: string) => {
    const statusNames = {
      not_started: '未开始',
      in_progress: '进行中',
      completed: '已完成'
    }
    return statusNames[status as keyof typeof statusNames] || status
  }

  const getStatusColor = (status: string) => {
    const statusColors = {
      not_started: 'text-gray-600 bg-gray-100',
      in_progress: 'text-yellow-600 bg-yellow-100',
      completed: 'text-green-600 bg-green-100'
    }
    return statusColors[status as keyof typeof statusColors] || 'text-gray-600 bg-gray-100'
  }

  const filteredTasks = tasks.filter(task => task.status === activeTab)

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">生产任务</h1>
          <p className="mt-2 text-sm text-gray-700">
            查看和执行分配给您的生产任务
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={fetchTasks}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'not_started', name: '未开始' },
              { key: 'in_progress', name: '进行中' },
              { key: 'completed', name: '已完成' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name} ({tasks.filter(t => t.status === tab.key).length})
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTasks.map((task) => (
          <div key={task.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {task.operation_name}
                </h3>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                  {getStatusName(task.status)}
                </span>
              </div>
              
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600">
                  工单: {task.work_order_id.substring(0, 8)}...
                </p>
                <p className="text-sm text-gray-600">
                  产线: {task.production_line_name}
                </p>
                <p className="text-sm text-gray-600">
                  进度: {task.completed_output}/{task.planned_output}
                </p>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(task.completed_output / task.planned_output) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="mt-4 flex space-x-2">
                {task.status === 'not_started' && (
                  <button
                    onClick={() => handleStartTask(task.id)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    开始
                  </button>
                )}
                
                {task.status === 'in_progress' && (
                  <>
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Package className="h-4 w-4 mr-1" />
                      投料/报工
                    </button>
                  </>
                )}
                
                {task.status === 'completed' && (
                  <span className="inline-flex items-center px-3 py-2 text-sm leading-4 font-medium text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    已完成
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-2/3 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                任务操作: {selectedTask.operation_name}
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">物料投料</h4>
                <div className="space-y-3 mb-4">
                  {(selectedTask.material_requirements || []).map((req) => (
                    <div key={req.material_id} className="border rounded p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{req.material_name}</span>
                        <span className="text-sm text-gray-600">
                          {req.fed_quantity}/{req.required_quantity}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(req.fed_quantity / req.required_quantity) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <form onSubmit={handleFeedMaterial} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">选择物料</label>
                    <select
                      required
                      value={feedingMaterial.materialId}
                      onChange={(e) => setFeedingMaterial({ ...feedingMaterial, materialId: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">选择物料</option>
                      {(selectedTask.material_requirements || []).map((req) => (
                        <option key={req.material_id} value={req.material_id}>
                          {req.material_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">投料数量</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={feedingMaterial.quantity}
                      onChange={(e) => setFeedingMaterial({ ...feedingMaterial, quantity: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                  >
                    投料
                  </button>
                </form>
              </div>
              
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">生产报工</h4>
                <div className="mb-4">
                  <div className="border rounded p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">产出进度</span>
                      <span className="text-sm text-gray-600">
                        {selectedTask.completed_output}/{selectedTask.planned_output}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(selectedTask.completed_output / selectedTask.planned_output) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <form onSubmit={handleReportProduction} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">报工数量</label>
                    <input
                      type="number"
                      min="1"
                      max={selectedTask.planned_output - selectedTask.completed_output}
                      required
                      value={reportingQuantity}
                      onChange={(e) => setReportingQuantity(parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      最大可报工: {selectedTask.planned_output - selectedTask.completed_output}
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                  >
                    报工
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
