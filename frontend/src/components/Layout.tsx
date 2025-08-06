import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Home, Users, Package, Factory, Route, FileText, 
  ClipboardList, LogOut, Settings
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: '仪表板', href: '/', icon: Home, roles: ['admin', 'manager', 'worker', 'inspector'] },
    { name: '用户管理', href: '/users', icon: Users, roles: ['admin'] },
    { name: '物料管理', href: '/materials', icon: Package, roles: ['manager'] },
    { name: '产线管理', href: '/production-lines', icon: Factory, roles: ['manager'] },
    { name: '工艺路线', href: '/routings', icon: Route, roles: ['manager'] },
    { name: '物料清单', href: '/boms', icon: FileText, roles: ['manager'] },
    { name: '工单管理', href: '/work-orders', icon: ClipboardList, roles: ['manager'] },
  ]

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || '')
  )

  const handleInitTestData = async () => {
    try {
      const response = await fetch('https://app-npkmklju.fly.dev/api/init-test-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        alert('测试数据初始化成功！')
        window.location.reload()
      } else {
        alert('初始化失败')
      }
    } catch (error) {
      alert('初始化失败')
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex flex-col w-64 bg-white shadow-lg">
        <div className="flex items-center justify-center h-16 bg-blue-600 text-white">
          <h1 className="text-xl font-bold">生产执行系统</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <nav className="mt-5 px-2">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md mb-1 ${
                    isActive
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-4 h-6 w-6" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          {user?.role === 'admin' && (
            <button
              onClick={handleInitTestData}
              className="w-full mb-2 flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
            >
              <Settings className="mr-3 h-5 w-5" />
              初始化测试数据
            </button>
          )}
          
          <div className="flex items-center px-2 py-2 text-sm text-gray-600 mb-2">
            <Users className="mr-3 h-5 w-5" />
            {user?.username} ({user?.role})
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="mr-3 h-5 w-5" />
            退出登录
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
