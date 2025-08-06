import { useState, useEffect } from 'react'
import { Play, CheckCircle, RefreshCw } from 'lucide-react'

interface InspectionTask {
  id: string
  work_order_id: string
  operation_index: number
  operation_name: string
  assigned_inspector: string
  status: 'not_started' | 'in_progress' | 'completed'
  total_quantity: number
  qualified_quantity: number
  unqualified_quantity: number
  created_at: string
}

export default function InspectionTasksPage() {
  const [tasks, setTasks] = useState<InspectionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'not_started' | 'in_progress' | 'completed'>('in_progress')
  const [selectedTask, setSelectedTask] = useState<InspectionTask | null>(null)
  const [inspectionData, setInspectionData] = useState({ passed: 0, failed: 0 })

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('https://app-npkmklju.fly.dev/api/inspection-tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Failed to fetch inspection tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`https://app-npkmklju.fly.dev/api/inspection-tasks/${taskId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        fetchTasks()
      } else {
        const error = await response.json()
        alert(error.detail || '启动检验任务失败')
      }
    } catch (error) {
      alert('启动检验任务失败')
    }
  }

  const handleReportInspection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`https://app-npkmklju.fly.dev/api/inspection-tasks/${selectedTask.id}/report-inspection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          qualified_quantity: inspectionData.passed,
          unqualified_quantity: inspectionData.failed
        })
      })
      
      if (response.ok) {
        setInspectionData({ passed: 0, failed: 0 })
        setSelectedTask(null)
        fetchTasks()
      } else {
        const error = await response.json()
        alert(error.detail || '检验报告失败')
      }
    } catch (error) {
      alert('检验报告失败')
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
          <h1 className="text-xl font-semibold text-gray-900">检验任务</h1>
          <p className="mt-2 text-sm text-gray-700">
            查看和执行分配给您的质量检验任务
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
                  检验进度: {task.qualified_quantity + task.unqualified_quantity}/{task.total_quantity}
                </p>
                <p className="text-sm text-gray-600">
                  合格: {task.qualified_quantity} | 不合格: {task.unqualified_quantity}
                </p>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${((task.qualified_quantity + task.unqualified_quantity) / task.total_quantity) * 100}%` }}
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
                    开始检验
                  </button>
                )}
                
                {task.status === 'in_progress' && (
                  <button
                    onClick={() => setSelectedTask(task)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    检验报告
                  </button>
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                检验报告: {selectedTask.operation_name}
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <div className="border rounded p-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">检验进度</span>
                  <span className="text-sm text-gray-600">
                    {selectedTask.qualified_quantity + selectedTask.unqualified_quantity}/{selectedTask.total_quantity}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${((selectedTask.qualified_quantity + selectedTask.unqualified_quantity) / selectedTask.total_quantity) * 100}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-gray-500">合格:</span>
                    <span className="ml-2 font-medium text-green-600">{selectedTask.qualified_quantity}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">不合格:</span>
                    <span className="ml-2 font-medium text-red-600">{selectedTask.unqualified_quantity}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleReportInspection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">合格数量</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={inspectionData.passed}
                  onChange={(e) => setInspectionData({ ...inspectionData, passed: parseInt(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">不合格数量</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={inspectionData.failed}
                  onChange={(e) => setInspectionData({ ...inspectionData, failed: parseInt(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div className="text-sm text-gray-500">
                本次检验总数: {inspectionData.passed + inspectionData.failed}
              </div>
              <div className="text-sm text-gray-500">
                剩余待检验: {selectedTask.total_quantity - (selectedTask.qualified_quantity + selectedTask.unqualified_quantity)}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                >
                  提交检验结果
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
