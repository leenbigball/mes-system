import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

interface User {
  id: string
  username: string
  role: 'admin' | 'manager' | 'worker' | 'inspector'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchCurrentUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`)
      setUser(response.data)
    } catch (error) {
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    console.log('Login attempt:', { username, password })
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username,
      password
    })
    
    console.log('Login response:', response.data)
    const { token, user: userData } = response.data
    localStorage.setItem('token', token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(userData)
  }

  const logout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout`)
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
