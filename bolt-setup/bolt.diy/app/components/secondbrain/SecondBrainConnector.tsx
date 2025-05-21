'use client'

import { useState, useEffect } from 'react'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Input } from '../../ui/Input'
import { Badge } from '../../ui/Badge'
import { Dropdown } from '../../ui/Dropdown'
import { Progress } from '../../ui/Progress'
import { IconButton } from '../../ui/IconButton'
import LoadingDots from '../../ui/LoadingDots'

/**
 * SecondBrain API Bridge Connector
 * A Bolt DIY component for interacting with the SecondBrain API Bridge
 */
export default function SecondBrainConnector() {
  const [apiUrl, setApiUrl] = useState('http://localhost:3030/api')
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [errorMessage, setErrorMessage] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [profileData, setProfileData] = useState<any[]>([])
  const [selectedProfile, setSelectedProfile] = useState('')
  const [prompt, setPrompt] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Check connection on mount
  useEffect(() => {
    checkConnection()
  }, [])
  
  // Check connection to the API Bridge
  async function checkConnection() {
    setConnectionStatus('connecting')
    setErrorMessage('')
    
    try {
      const response = await fetch(`${apiUrl}/health`)
      
      if (!response.ok) {
        throw new Error(`Connection failed with status ${response.status}`)
      }
      
      const data = await response.json()
      console.log('API Bridge health data:', data)
      
      if (data.status === 'ok') {
        setConnectionStatus('connected')
        // Optionally load profiles if we have a token
        if (token) {
          loadProfiles()
        }
      } else {
        setConnectionStatus('error')
        setErrorMessage(`API Bridge reported status: ${data.status}`)
      }
    } catch (error) {
      console.error('Connection error:', error)
      setConnectionStatus('error')
      setErrorMessage(error instanceof Error ? error.message : String(error))
    }
  }
  
  // Login to the API Bridge
  async function login() {
    if (!email || !password) {
      setErrorMessage('Email and password are required')
      return
    }
    
    setConnectionStatus('connecting')
    setErrorMessage('')
    
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Login failed with status ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.session && data.session.access_token) {
        setToken(data.session.access_token)
        setConnectionStatus('connected')
        // Load profiles after successful login
        loadProfiles()
      } else {
        setConnectionStatus('error')
        setErrorMessage('Login succeeded but no access token was returned')
      }
    } catch (error) {
      console.error('Login error:', error)
      setConnectionStatus('error')
      setErrorMessage(error instanceof Error ? error.message : String(error))
    }
  }
  
  // Load style profiles from the API Bridge
  async function loadProfiles() {
    if (!token) {
      setErrorMessage('Authentication token is required')
      return
    }
    
    try {
      const response = await fetch(`${apiUrl}/style-profiles`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to load profiles with status ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.profiles) {
        setProfileData(data.profiles)
        if (data.profiles.length > 0) {
          setSelectedProfile(data.profiles[0].id)
        }
      } else {
        setErrorMessage('No profiles were returned')
      }
    } catch (error) {
      console.error('Error loading profiles:', error)
      setErrorMessage(error instanceof Error ? error.message : String(error))
    }
  }
  
  // Generate content via the API Bridge
  async function generateContent() {
    if (!token) {
      setErrorMessage('Authentication token is required')
      return
    }
    
    if (!selectedProfile) {
      setErrorMessage('Style profile is required')
      return
    }
    
    if (!prompt) {
      setErrorMessage('Prompt is required')
      return
    }
    
    setIsGenerating(true)
    setErrorMessage('')
    
    try {
      const response = await fetch(`${apiUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          styleProfileId: selectedProfile,
          prompt,
          contentType: 'article',
          options: {
            style_emphasis: 0.7,
            formality: 0.4,
            detail_level: 0.6
          }
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Content generation failed with status ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.content && data.content.content) {
        setGeneratedContent(data.content.content)
      } else {
        setErrorMessage('No content was returned')
      }
    } catch (error) {
      console.error('Error generating content:', error)
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Execute an agent workflow via the API Bridge
  async function executeAgent() {
    if (!token) {
      setErrorMessage('Authentication token is required')
      return
    }
    
    if (!prompt) {
      setErrorMessage('Prompt is required')
      return
    }
    
    setIsGenerating(true)
    setErrorMessage('')
    
    try {
      const response = await fetch(`${apiUrl}/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId: 'content_generator',
          input: prompt,
          context: {
            styleProfile: selectedProfile || 'tina_style'
          }
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Agent execution failed with status ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.response && data.response.output) {
        setGeneratedContent(data.response.output)
      } else {
        setErrorMessage('No content was returned from the agent')
      }
    } catch (error) {
      console.error('Error executing agent:', error)
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsGenerating(false)
    }
  }
  
  return (
    <div className="flex flex-col gap-6 p-4">
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">SecondBrain API Bridge Connector</h2>
        
        <div className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">API Bridge URL</label>
              <Input 
                value={apiUrl} 
                onChange={(e) => setApiUrl(e.target.value)} 
                placeholder="http://localhost:3030/api" 
              />
            </div>
            
            <Button onClick={checkConnection}>
              Connect
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm">Status:</span>
            {connectionStatus === 'connected' && (
              <Badge className="bg-green-500">Connected</Badge>
            )}
            {connectionStatus === 'connecting' && (
              <Badge className="bg-blue-500">Connecting...</Badge>
            )}
            {connectionStatus === 'disconnected' && (
              <Badge className="bg-gray-500">Disconnected</Badge>
            )}
            {connectionStatus === 'error' && (
              <Badge className="bg-red-500">Error</Badge>
            )}
          </div>
          
          {errorMessage && (
            <div className="px-3 py-2 rounded bg-red-100 text-red-600 text-sm">
              {errorMessage}
            </div>
          )}
        </div>
      </Card>
      
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Authentication</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="user@example.com" 
              type="email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              type="password"
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={login} disabled={connectionStatus !== 'connected'}>
              Login
            </Button>
            
            {token && (
              <Button variant="secondary" onClick={loadProfiles}>
                Load Profiles
              </Button>
            )}
          </div>
        </div>
      </Card>
      
      {token && (
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Content Generation</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Style Profile</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
              >
                <option value="">Select a profile</option>
                {profileData.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Prompt</label>
              <textarea
                className="w-full rounded border border-gray-300 px-3 py-2 min-h-[100px]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={generateContent} 
                disabled={isGenerating || !token || !selectedProfile || !prompt}
              >
                {isGenerating ? (
                  <span className="flex items-center">
                    Generating <LoadingDots className="ml-2" />
                  </span>
                ) : 'Generate Content'}
              </Button>
              
              <Button 
                variant="secondary"
                onClick={executeAgent} 
                disabled={isGenerating || !token || !prompt}
              >
                Execute Agent
              </Button>
            </div>
            
            {isGenerating && (
              <div className="py-2">
                <Progress value={50} />
                <p className="text-xs text-center mt-1">Generating content...</p>
              </div>
            )}
            
            {generatedContent && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Generated Content</label>
                <div className="border rounded p-4 bg-gray-50 whitespace-pre-wrap min-h-[200px] max-h-[400px] overflow-y-auto">
                  {generatedContent}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}