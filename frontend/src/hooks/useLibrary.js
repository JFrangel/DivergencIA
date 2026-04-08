import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import { trackProgress } from '../lib/trackProgress'

export function useLibrary({ projectId, tag, tipo } = {}) {
  const { user } = useAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)

    // Get current user role to check if admin/directora
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user?.id)
      .single()
    const isAdminUser = perfil?.rol === 'admin' || perfil?.rol === 'directora'

    let query = supabase
      .from('archivos')
      .select('*, subido:subido_por(id, nombre, foto_url, es_fundador, area_investigacion)')
      .order('fecha_subida', { ascending: false })

    if (projectId) query = query.eq('proyecto_id', projectId)
    if (tipo) query = query.eq('tipo', tipo)
    if (tag) query = query.contains('tags', [tag])

    // Visibility filter — admins see all, others filtered
    if (!isAdminUser) {
      if (user) {
        // Authenticated users: see todos, miembros, or own files
        query = query.or(`visibilidad.eq.todos,visibilidad.eq.miembros,visibilidad.is.null,subido_por.eq.${user.id}`)
      } else {
        // Visitors: see only public files (visibilidad.eq.todos)
        query = query.or(`visibilidad.eq.todos,visibilidad.is.null`)
      }
    }

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
    const bucket = 'archivos'

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
        visibilidad: metadata.visibilidad || 'miembros',
        ...metadata,
      })
      .select('*, subido:subido_por(id, nombre, foto_url, es_fundador, area_investigacion)')
      .single()

    setUploading(false)
    if (error) { toast.error('Error al registrar archivo'); return { error } }

    setFiles(f => [data, ...f])
    toast.success('Archivo subido')
    trackProgress(user.id, 'files_uploaded', 1)
    return { data }
  }

  const remove = async (id, url) => {
    const extractPath = (u) => {
      if (!u) return null
      try {
        const marker = '/object/public/archivos/'
        const idx = u.indexOf(marker)
        if (idx !== -1) return decodeURIComponent(u.slice(idx + marker.length).split('?')[0])
        return u.split('/archivos/')[1]?.split('?')[0] || null
      } catch { return null }
    }

    // Delete version storage files first to avoid FK constraint errors
    const { data: versions } = await supabase
      .from('versiones_archivo')
      .select('url')
      .eq('archivo_id', id)

    const versionPaths = (versions || []).map(v => extractPath(v.url)).filter(Boolean)
    if (versionPaths.length > 0) {
      await supabase.storage.from('archivos').remove(versionPaths).catch(() => {})
    }

    // Delete version records (FK from versiones_archivo → archivos)
    await supabase.from('versiones_archivo').delete().eq('archivo_id', id).catch(() => {})

    // Delete main storage file
    const path = extractPath(url)
    if (path) await supabase.storage.from('archivos').remove([path]).catch(() => {})

    // Delete DB record
    const { error } = await supabase.from('archivos').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar archivo'); return }

    setFiles(f => f.filter(x => x.id !== id))
    toast.success('Archivo eliminado')
  }

  const incrementDescargas = async (id) => {
    await supabase.rpc('increment_descargas', { archivo_id: id }).catch(() => {})
  }

  const updateFile = async (id, updates) => {
    const { error } = await supabase.from('archivos').update(updates).eq('id', id)
    if (error) { toast.error('Error al actualizar archivo'); return { error } }
    setFiles(f => f.map(x => x.id === id ? { ...x, ...updates } : x))
    toast.success('Archivo actualizado')
    return {}
  }

  const updateVisibilidad = async (id, visibilidad, visibilidadUsuarios = []) => {
    const { error } = await supabase
      .from('archivos')
      .update({ visibilidad, visibilidad_usuarios: visibilidadUsuarios })
      .eq('id', id)
    if (error) { toast.error('Error al actualizar visibilidad'); return { error } }
    setFiles(f => f.map(x => x.id === id ? { ...x, visibilidad, visibilidad_usuarios: visibilidadUsuarios } : x))
    toast.success('Visibilidad actualizada')
    return {}
  }

  const updateContent = async (id, url, text) => {
    const extractPath = (u) => {
      if (!u) return null
      try {
        const marker = '/object/public/archivos/'
        const idx = u.indexOf(marker)
        if (idx !== -1) return decodeURIComponent(u.slice(idx + marker.length).split('?')[0])
        return u.split('/archivos/')[1]?.split('?')[0] || null
      } catch { return null }
    }
    const path = extractPath(url)
    if (!path) { toast.error('No se pudo identificar el archivo'); return { error: 'path not found' } }
    const blob = new Blob([text], { type: 'text/plain' })
    const { error } = await supabase.storage.from('archivos').upload(path, blob, { upsert: true })
    if (error) { toast.error('Error al guardar el archivo'); return { error } }
    toast.success('Archivo guardado')
    return {}
  }

  // Upload a new version of an existing file
  const uploadVersion = async (archivoId, file, nota = '') => {
    if (!user) return { error: 'No autenticado' }
    setUploading(true)

    // Get current file to snapshot its url as previous version
    const currentFile = files.find(f => f.id === archivoId)
    if (!currentFile) { setUploading(false); return { error: 'Archivo no encontrado' } }

    // Get current max version number
    const { data: lastVer } = await supabase
      .from('versiones_archivo')
      .select('version')
      .eq('archivo_id', archivoId)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const nextVersion = (lastVer?.version || 0) + 1

    // Save current file as a version entry (snapshot before overwriting)
    if (currentFile.url && nextVersion === 1) {
      await supabase.from('versiones_archivo').insert({
        archivo_id: archivoId,
        version: 0,
        url: currentFile.url,
        tamanio_bytes: currentFile.tamanio_bytes,
        nota: 'Versión original',
        autor_id: currentFile.subido_por || user.id,
      })
    }

    // Upload new file to storage
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('archivos').upload(path, file)
    if (uploadError) { toast.error('Error al subir nueva versión'); setUploading(false); return { error: uploadError } }

    const { data: { publicUrl } } = supabase.storage.from('archivos').getPublicUrl(path)

    // Register new version
    await supabase.from('versiones_archivo').insert({
      archivo_id: archivoId,
      version: nextVersion,
      url: publicUrl,
      tamanio_bytes: file.size,
      nota: nota || `Versión ${nextVersion}`,
      autor_id: user.id,
    })

    // Update the main file record with the new url
    const { error: updateError } = await supabase
      .from('archivos')
      .update({ url: publicUrl, tamanio_bytes: file.size })
      .eq('id', archivoId)

    setUploading(false)
    if (updateError) { toast.error('Error actualizando archivo'); return { error: updateError } }

    setFiles(f => f.map(x => x.id === archivoId ? { ...x, url: publicUrl, tamanio_bytes: file.size } : x))
    toast.success(`✓ Versión ${nextVersion} subida correctamente`)
    return { data: { version: nextVersion, url: publicUrl } }
  }

  return { files, loading, uploading, refetch: fetch, upload, remove, incrementDescargas, updateVisibilidad, updateFile, updateContent, uploadVersion }
}
