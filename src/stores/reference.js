import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export const useReferenceStore = defineStore('reference', {
  state: () => ({
    materials: [],
    currentMaterial: null,
    loading: false,
    error: null,
    searchResults: [],
    searchLoading: false,
    searchError: null,
    currentSearchQuery: ''
  }),

  getters: {
    // 카테고리별 자료 필터링
    getMaterialsByCategory: (state) => (category) => {
      return state.materials.filter(m => 
        !m.deleted_at && 
        (category === 'all' || m.category === category)
      )
    },
    
    // 즐겨찾기 자료
    favoriteMaterials: (state) => {
      return state.materials.filter(m => !m.deleted_at && m.is_favorite)
    },
    
    // 정렬된 자료 (최신순)
    sortedMaterials: (state) => {
      return [...state.materials]
        .filter(m => !m.deleted_at)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }
  },

  actions: {
    // 통합 검색 - 모든 소스에서 검색
    async searchUnified(query, sources = [], mediaType = 'image', page = 1) {
      this.searchLoading = true
      this.searchError = null
      this.currentSearchQuery = query
      
      try {
        const allResults = []
        const errors = []
        
        // Wikipedia 검색
        if (sources.includes('wikipedia')) {
          try {
            const response = await fetch('/.netlify/functions/searchWikipediaEnhanced', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, language: 'ko' })
            })
            
            const result = await response.json()
            if (result.success && result.data.results) {
              // Wikipedia 결과를 이미지 형식으로 변환
              result.data.results.forEach(page => {
                if (page.images && page.images.length > 0) {
                  page.images.forEach((img, index) => {
                    allResults.push({
                      id: `${page.id}_img_${index}`,
                      title: img.title || `${page.title} - Image ${index + 1}`,
                      description: page.description,
                      url: page.url,
                      image: img.url,
                      thumbnail: img.url,
                      source_type: 'wikipedia',
                      source: 'wikipedia',
                      sourceLabel: 'Wikipedia',
                      license: img.license || { name: 'Unknown' }
                    })
                  })
                }
              })
            }
          } catch (error) {
            console.error('Wikipedia search error:', error)
            errors.push('Wikipedia search failed')
          }
        }
        
        // 이미지 소스들 검색 (Pixabay, Unsplash, Pexels, Flickr, Commons, Google)
        const imageSources = sources.filter(s => 
          ['pixabay', 'unsplash', 'pexels', 'flickr', 'commons', 'google'].includes(s)
        )
        
        if (imageSources.length > 0) {
          try {
            const response = await fetch('/.netlify/functions/searchImages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, sources: imageSources, mediaType, page, per_page: 20 })
            })
            
            const result = await response.json()
            if (result.success && result.data.results) {
              allResults.push(...result.data.results)
            }
            if (result.data.errors) {
              errors.push(...result.data.errors)
            }
          } catch (error) {
            console.error('Image search error:', error)
            errors.push('Image search failed')
          }
        }
        
        // Met Museum 검색
        if (sources.includes('met')) {
          try {
            const response = await fetch('/.netlify/functions/searchMetMuseum', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, page, per_page: 20 })
            })
            
            const result = await response.json()
            if (result.success && result.data.results) {
              allResults.push(...result.data.results)
            }
          } catch (error) {
            console.error('Met Museum search error:', error)
            errors.push('Met Museum search failed')
          }
        }
        
        // Europeana 검색
        if (sources.includes('europeana')) {
          try {
            const response = await fetch('/.netlify/functions/searchEuropeana', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, page, per_page: 20 })
            })
            
            const result = await response.json()
            if (result.success && result.data.results) {
              allResults.push(...result.data.results)
            }
          } catch (error) {
            console.error('Europeana search error:', error)
            errors.push('Europeana search failed')
          }
        }
        
        // DPLA 검색
        if (sources.includes('dpla')) {
          try {
            const response = await fetch('/.netlify/functions/searchDPLA', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, page, per_page: 20 })
            })
            
            const result = await response.json()
            if (result.success && result.data.results) {
              allResults.push(...result.data.results)
            }
          } catch (error) {
            console.error('DPLA search error:', error)
            errors.push('DPLA search failed')
          }
        }
        
        // 결과를 소스별로 균등하게 섞기
        const mixedResults = []
        const resultsBySource = {}
        
        sources.forEach(source => {
          resultsBySource[source] = allResults.filter(r => 
            r.source === source || r.source_type === source
          )
        })
        
        const maxLength = Math.max(...Object.values(resultsBySource).map(arr => arr.length))
        
        for (let i = 0; i < maxLength; i++) {
          for (const source of sources) {
            if (resultsBySource[source] && i < resultsBySource[source].length) {
              mixedResults.push(resultsBySource[source][i])
            }
          }
        }
        
        this.searchResults = mixedResults
        
        if (errors.length > 0) {
          console.warn('Some searches failed:', errors)
        }
        
        return { success: true, data: { results: mixedResults } }
      } catch (error) {
        console.error('Unified search error:', error)
        this.searchError = error.message
        return { success: false, error: error.message }
      } finally {
        this.searchLoading = false
      }
    },
    
    // 프로젝트의 레퍼런스 자료 가져오기
    async fetchMaterials(projectId = null) {
      this.loading = true
      this.error = null
      
      try {
        let query = supabase
          .from('reference_materials')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (projectId) {
          query = query.eq('project_id', projectId)
        }
        
        const { data, error } = await query
        
        if (error) throw error
        
        // 잘못된 Vimeo 썸네일 URL 수정
        const fixedMaterials = (data || []).map(material => {
          if (material.thumbnail_url && material.thumbnail_url.includes('undefined')) {
            // 비디오 자료의 경우 storage_url을 썸네일로 사용
            return {
              ...material,
              thumbnail_url: material.storage_url || material.thumbnail_url
            }
          }
          return material
        })
        
        this.materials = fixedMaterials
        return { success: true, data: fixedMaterials }
      } catch (error) {
        console.error('Error fetching reference materials:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    // Wikipedia 검색
    async searchWikipedia(query, language = 'ko') {
      this.searchLoading = true
      this.searchError = null
      this.currentSearchQuery = query
      
      try {
        const response = await fetch('/.netlify/functions/searchWikipediaEnhanced', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query, language })
        })
        
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.message || 'Wikipedia search failed')
        }
        
        // 각 페이지의 모든 이미지를 개별 검색 결과로 변환
        const allResults = []
        
        result.data.results.forEach(page => {
          // 페이지에 이미지가 있으면 각 이미지를 개별 항목으로 추가
          if (page.images && page.images.length > 0) {
            page.images.forEach((img, index) => {
              allResults.push({
                id: `${page.id}_img_${index}`,
                title: img.title || `${page.title} - Image ${index + 1}`,
                description: page.description,
                extract: index === 0 ? page.extract : '', // 첫 이미지에만 설명 포함
                url: page.url,
                image: img.url,
                thumbnail: img.url,
                source_type: 'wikipedia',
                language: page.language,
                pageTitle: page.title,
                isMainImage: img.isMain || false,
                // 라이선스 정보
                license: img.license || { name: 'Unknown' },
                attribution: img.attribution || {},
                imageMetadata: {
                  width: img.width,
                  height: img.height,
                  uploadedBy: img.uploadedBy,
                  timestamp: img.timestamp,
                  descriptionUrl: img.descriptionUrl
                }
              })
            })
          } else if (page.mainImage || page.thumbnail) {
            // 이미지 배열이 없으면 메인 이미지만 추가 (기존 방식 폴백)
            allResults.push({
              ...page,
              image: page.mainImage || page.image,
              source_type: 'wikipedia'
            })
          }
        })
        
        this.searchResults = allResults
        
        return { success: true, data: { ...result.data, results: allResults } }
      } catch (error) {
        console.error('Error searching Wikipedia:', error)
        this.searchError = error.message
        return { success: false, error: error.message }
      } finally {
        this.searchLoading = false
      }
    },

    // 이미지 검색
    async searchImages(query, sources = ['pixabay', 'unsplash'], page = 1) {
      this.searchLoading = true
      this.searchError = null
      this.currentSearchQuery = query
      
      try {
        const response = await fetch('/.netlify/functions/searchImages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query, sources, page, per_page: 20 })
        })
        
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.message || 'Image search failed')
        }
        
        // 기존 결과에 추가 (페이지네이션)
        if (page === 1) {
          this.searchResults = result.data.results.map(item => ({
            ...item,
            source_type: 'external_image'
          }))
        } else {
          this.searchResults.push(...result.data.results.map(item => ({
            ...item,
            source_type: 'external_image'
          })))
        }
        
        return { success: true, data: result.data }
      } catch (error) {
        console.error('Error searching images:', error)
        this.searchError = error.message
        return { success: false, error: error.message }
      } finally {
        this.searchLoading = false
      }
    },

    // 검색 결과 지우기
    clearSearchResults() {
      this.searchResults = []
      this.currentSearchQuery = ''
      this.searchError = null
    },

    // 레퍼런스 자료 저장
    async saveMaterial(materialData) {
      this.loading = true
      this.error = null
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        // UUID 생성 (crypto.randomUUID() 사용)
        const id = crypto.randomUUID()

        const { data, error } = await supabase
          .from('reference_materials')
          .insert([{
            id,  // ID 명시적 제공
            ...materialData,
            user_id: user.id
          }])
          .select()
          .single()
        
        if (error) throw error
        
        this.materials.unshift(data)
        return { success: true, data }
      } catch (error) {
        console.error('Error saving reference material:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    // 레퍼런스 자료 업데이트
    async updateMaterial(materialId, updates) {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await supabase
          .from('reference_materials')
          .update(updates)
          .eq('id', materialId)
          .select()
          .single()
        
        if (error) throw error
        
        const index = this.materials.findIndex(m => m.id === materialId)
        if (index !== -1) {
          this.materials[index] = data
        }
        
        if (this.currentMaterial?.id === materialId) {
          this.currentMaterial = data
        }
        
        return { success: true, data }
      } catch (error) {
        console.error('Error updating reference material:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    // 즐겨찾기 토글
    async toggleFavorite(materialId) {
      const material = this.materials.find(m => m.id === materialId)
      if (!material) return { success: false, error: 'Material not found' }
      
      return await this.updateMaterial(materialId, { 
        is_favorite: !material.is_favorite 
      })
    },

    // 레퍼런스 자료 삭제 (soft delete)
    async deleteMaterial(materialId) {
      this.loading = true
      this.error = null
      
      try {
        const { error } = await supabase
          .from('reference_materials')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', materialId)
        
        if (error) throw error
        
        this.materials = this.materials.filter(m => m.id !== materialId)
        
        if (this.currentMaterial?.id === materialId) {
          this.currentMaterial = null
        }
        
        return { success: true }
      } catch (error) {
        console.error('Error deleting reference material:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    // 특정 자료 가져오기
    async getMaterial(materialId) {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await supabase
          .from('reference_materials')
          .select('*')
          .eq('id', materialId)
          .single()
        
        if (error) throw error
        
        this.currentMaterial = data
        return { success: true, data }
      } catch (error) {
        console.error('Error fetching reference material:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    }
  }
})