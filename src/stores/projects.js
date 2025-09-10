import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects: [],
    sharedProjects: [],
    currentProject: null,
    loading: false,
    error: null
  }),

  getters: {
    sortedProjects: (state) => {
      return [...state.projects].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )
    },
    
    activeProjects: (state) => {
      return state.projects.filter(p => !p.deleted_at)
    }
  },

  actions: {
    async fetchProjects() {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        this.projects = data || []
        return { success: true, data }
      } catch (error) {
        console.error('Error fetching projects:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    async createProject(projectData) {
      this.loading = true
      this.error = null
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { data, error } = await supabase
          .from('projects')
          .insert([{
            ...projectData,
            user_id: user.id
          }])
          .select()
          .single()
        
        if (error) throw error
        
        this.projects.unshift(data)
        return { success: true, data }
      } catch (error) {
        console.error('Error creating project:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    async updateProject(projectId, updates) {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await supabase
          .from('projects')
          .update(updates)
          .eq('id', projectId)
          .select()
          .single()
        
        if (error) throw error
        
        const index = this.projects.findIndex(p => p.id === projectId)
        if (index !== -1) {
          this.projects[index] = data
        }
        
        if (this.currentProject?.id === projectId) {
          this.currentProject = data
        }
        
        return { success: true, data }
      } catch (error) {
        console.error('Error updating project:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    async deleteProject(projectId) {
      this.loading = true
      this.error = null
      
      try {
        // Soft delete (deleted_at 필드 업데이트)
        const { error } = await supabase
          .from('projects')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', projectId)
        
        if (error) throw error
        
        // 로컬 상태에서 제거
        this.projects = this.projects.filter(p => p.id !== projectId)
        
        return { success: true }
      } catch (error) {
        console.error('Error deleting project:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    async getProject(projectId) {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()
        
        if (error) throw error
        
        this.currentProject = data
        
        // last_accessed_at 업데이트
        await supabase
          .from('projects')
          .update({ last_accessed_at: new Date().toISOString() })
          .eq('id', projectId)
        
        return { success: true, data }
      } catch (error) {
        console.error('Error fetching project:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    async fetchSharedProjects() {
      this.loading = true
      this.error = null
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { data, error } = await supabase
          .from('project_shares')
          .select(`
            *,
            projects!inner (
              id,
              name,
              description,
              thumbnail_url,
              tags,
              created_at,
              updated_at,
              user_id,
              status
            )
          `)
          .eq('shared_with_user_id', user.id)
          .is('projects.deleted_at', null)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        // project_shares 데이터를 projects 형태로 변환
        this.sharedProjects = (data || []).map(share => ({
          ...share.projects,
          is_owner: false,
          permission_level: share.permission_level,
          shared_by_user_id: share.shared_by_user_id,
          share_id: share.id
        }))
        
        return { success: true, data: this.sharedProjects }
      } catch (error) {
        console.error('Error fetching shared projects:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    async shareProject(projectId, shareEmail, permissionLevel = 'editor') {
      this.loading = true
      this.error = null
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('User not authenticated')

        const response = await fetch('/.netlify/functions/shareProject', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            project_id: projectId,
            share_email: shareEmail,
            permission_level: permissionLevel
          })
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to share project')
        }
        
        return { success: true, data: result }
      } catch (error) {
        console.error('Error sharing project:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    }
  }
})