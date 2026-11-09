import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api } from '../api/cliente'
import { useSesion } from '../auth/AuthContext'
import { useAvisos } from '../components/avisos'
import { Campo, Encabezado } from '../components/ui'

export default function Perfil() {
  const { usuario } = useSesion()
  const avisar = useAvisos()
  const [d, setD] = useState({ actual: '', nueva: '', confirmar: '' })
  const m = useMutation({
    mutationFn: () => api.post('auth/cambiar-password/', { actual: d.actual, nueva: d.nueva }),
    onSuccess: () => { avisar('Contraseña actualizada.'); setD({ actual: '', nueva: '', confirmar: '' }) },
    onError: (e) => avisar(e.message, 'error'),
  })
  const coincide = d.nueva === d.confirmar
  const enviar = (e: FormEvent) => { e.preventDefault(); if (coincide) m.mutate() }
  return (
    <>
      <Encabezado titulo="Mi perfil" subtitulo={`${usuario?.nombre} · ${usuario?.email} · ${usuario?.rol_display}`} />
      <form onSubmit={enviar} className="tarjeta max-w-md space-y-4 p-6">
        <h2 className="font-semibold text-marca-900">Cambiar contraseña</h2>
        <Campo etiqueta="Contraseña actual"><input type="password" autoComplete="current-password" className="campo" value={d.actual} onChange={(e) => setD({ ...d, actual: e.target.value })} /></Campo>
        <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 8 caracteres; no puede ser común ni solo numérica"><input type="password" autoComplete="new-password" className="campo" value={d.nueva} onChange={(e) => setD({ ...d, nueva: e.target.value })} /></Campo>
        <Campo etiqueta="Confirmar nueva contraseña" error={d.confirmar && !coincide ? 'Las contraseñas no coinciden' : undefined}><input type="password" autoComplete="new-password" className="campo" value={d.confirmar} onChange={(e) => setD({ ...d, confirmar: e.target.value })} /></Campo>
        <button className="btn-primario" disabled={!d.actual || d.nueva.length < 8 || !coincide || m.isPending}>Actualizar contraseña</button>
      </form>
    </>
  )
}
