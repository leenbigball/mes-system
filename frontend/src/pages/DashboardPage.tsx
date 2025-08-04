import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Package, Factory, ClipboardList, Wrench, CheckSquare, Users } from 'lucide-react'

interface Stats {
  materials: number
  production_lines: number
  work_orders: number
  production_tasks: number
  inspection_tasks: number
  users: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({
    materials: 0,
    production_lines: 0,
    work_orders: 0,
    production_tasks: 0,
    inspection_tasks: 0,
    users: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const [materialsRes, linesRes, ordersRes, tasksRes, inspectionsRes, usersRes] = await Promise.allSettled([
        fetch('https://app-twlwzpul.fly.dev/api/materials', { headers }),
        fetch('https://app-twlwzpul.fly.dev/api/production-lines', { headers }),
        fetch('https://app-twlwzpul.fly.dev/api/work-orders', { headers }),
        fetch('https://app-twlwzpul.fly.dev/api/production-tasks', { headers }),
        fetch('https://app-twlwzpul.fly.dev/api/inspection-tasks', { headers }),
        user?.role === 'admin' ? fetch('https://app-twlwzpul.fly.dev/api/users', { headers }) : Promise.resolve({ ok: false })
      ])

      if (materialsRes.status === 'fulfilled' && materialsRes.value.ok) {
        const data = await materialsRes.value.json()
        setStats(prev => ({ ...prev, materials: data.length }))
      }
      
      if (linesRes.status === 'fulfilled' && linesRes.value.ok) {
        const data = await linesRes.value.json()
        setStats(prev => ({ ...prev, production_lines: data.length }))
      }
      
      if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
        const data = await ordersRes.value.json()
        setStats(prev => ({ ...prev, work_orders: data.length }))
      }
      
      if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
        const data = await tasksRes.value.json()
        setStats(prev => ({ ...prev, production_tasks: data.length }))
      }
      
      if (inspectionsRes.status === 'fulfilled' && inspectionsRes.value.ok) {
        const data = await inspectionsRes.value.json()
        setStats(prev => ({ ...prev, inspection_tasks: data.length }))
      }
      
      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const data = await (usersRes.value as Response).json()
        setStats(prev => ({ ...prev, users: data.length }))
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const statCards = [
    { name: '物料', value: stats.materials, icon: Package, color: 'bg-blue-500', roles: ['manager'] },
    { name: '产线', value: stats.production_lines, icon: Factory, color: 'bg-green-500', roles: ['manager'] },
    { name: '工单', value: stats.work_orders, icon: ClipboardList, color: 'bg-yellow-500', roles: ['manager'] },
    { name: '生产任务', value: stats.production_tasks, icon: Wrench, color: 'bg-purple-500', roles: ['worker', 'manager'] },
    { name: '检验任务', value: stats.inspection_tasks, icon: CheckSquare, color: 'bg-red-500', roles: ['inspector', 'manager'] },
    { name: '用户', value: stats.users, icon: Users, color: 'bg-indigo-500', roles: ['admin'] },
  ]

  const filteredStats = statCards.filter(stat => 
    stat.roles.includes(user?.role || '')
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">仪表板</h1>
        <p className="mt-1 text-sm text-gray-600">
          欢迎回来，{user?.username}！
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredStats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`${stat.color} rounded-md p-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            系统概览
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              生产执行系统 (MES) 帮助您管理整个生产流程，从物料管理到质量检验。
            </p>
          </div>
          <div className="mt-5">
            <div className="rounded-md bg-blue-50 p-4">
              <div className="text-sm text-blue-700">
                <p className="font-medium">当前角色: {user?.role === 'admin' ? '管理员' : user?.role === 'manager' ? '经理' : user?.role === 'worker' ? '工人' : '质检员'}</p>
                <p className="mt-1">
                  {user?.role === 'admin' && '您可以管理系统用户和初始化测试数据。'}
                  {user?.role === 'manager' && '您可以管理主数据、创建工单并分配任务。'}
                  {user?.role === 'worker' && '您可以查看和执行分配给您的生产任务。'}
                  {user?.role === 'inspector' && '您可以查看和执行分配给您的检验任务。'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
