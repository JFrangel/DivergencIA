import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'

export function useLibrary({ projectId, tag, tipo } = {}) {
  const { user } = useAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('archivos')
      .select('*, subido:usuarios(id, nombre, foto_url)')
      .order('fecha_subida', { ascending: false })

    if (projectId) query = query.eq('proyecto_id', projectId)
    if (tipo) query = query.eq('tipo', tipo)
    if (tag) query = query.contains('tags', [tag])

    const { data } = await query
    setFiles(data || [])
    setLoading(false)
  }, [projectId, tipo, tag])

  useEffect(() => { fetch() }, [fetch])

  const upload = async (file, metadata = {}) => {
    if (!user) return { error: 'No autenticado' }
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const bucket = metadata.publico ? 'archivos' : 'archivos'

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file)

    if (uploadError) {
      toast.error('Error al subir archivo')
      setUploading(false)
      return { error: uploadError }
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)

    const tipoMap = {
      pdf: 'pdf', ppt: 'ppt', pptx: 'ppt',
      csv: 'dataset', json: 'dataset',
      py: 'code', js: 'code', ts: 'code',
      mp4: 'video', mov: 'video',
      png: 'imagen', jpg: 'imagen', jpeg: 'imagen', gif: 'imagen',
    }

    const { data, error } = await supabase
      .from('archivos')
      .insert({
        nombre: file.name,
        url: publicUrl,
        tipo: tipoMap[ext?.toLowerCase()] || 'general',
        tamanio_bytes: file.size,
        subido_por: user.id,
        ...metadata,
      })
      .select('*, subido:usuarios(id, nombre, foto_url)')
      .single()

    setUploading(false)
    if (error) { toast.error('Error al registrar archivo'); return { error } }

    setFiles(f => [data, ...f])
    toast.success('Archivo subido')
    return { data }
  }

  const remove = async (id, url) => {
    // Extraer path del storage desde la URL
    const path = url?.split('/archivos/')[1]
    if (path) await supabase.storage.from('archivos').remove([path])
    await supabase.from('archivos').delete().eq('id', id)
    setFiles(f => f.filter(x => x.id !== id))
    toast.success('Archivo eliminado')
  }

  const incrementDescargas = async (id) => {
    await supabase.rpc('increment_descargas', { archivo_id: id }).catch(() => {})
  }

  return { files, loading, uploading, refetch: fetch, upload, remove, incrementDescargas }
}
