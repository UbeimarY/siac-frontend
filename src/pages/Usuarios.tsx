import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/cliente'
import { useProgramas } from '../api/consultas'
import type { Rol, Usuario } from '../api/tipos'
import { useSesion } from '../auth/AuthContext'
import { useAvisos } from '../components/avisos'
import { Avatar, Campo, Cargando, Encabezado, Insignia, MensajeError, Modal, TablaContenedor } from '../components/ui'
import { fechaHora } from '../lib/formato'

const ROLES: { valor: Rol; texto: string; ayuda: string }[] = [
  { valor: 'ADMIN', texto: 'Administrador institucional', ayuda: 'Acceso total, incluida la gestión de usuarios' },
  { valor: 'COORDINADOR', texto: 'Coordinador de calidad', ayuda: 'Visión de los seis programas, valida evidencias y configura alertas' },
  { valor: 'DIRECTOR', texto: 'Director de programa', ayuda: 'Gestiona indicadores y planes de sus programas' },
  { valor: 'RESPONSABLE', texto: 'Responsable de indicador', ayuda: 'Registra valores y carga evidencias de sus indicadores' },
  { valor: 'CONSULTA', texto: 'Usuario de consulta', ayuda: 'Solo lectura' },
]

function FormularioUsuario({ inicial, cerrar }: { inicial?: Usuario; cerrar: () => void }) {
  const qc = useQueryClient()
  const avisar = useAvisos()
  const { data: progs } = useProgramas()
  const [d, setD] = useState({
    email: inicial?.email ?? '', first_name: inicial?.first_name ?? '', last_name: inicial?.last_name ?? '',
    rol: inicial?.rol ?? 'RESPONSABLE', cargo: inicial?.cargo ?? '', programas: inicial?.programas ?? [], password: '',
  })
  const global = d.rol === 'ADMIN' || d.rol === 'COORDINADOR'
  const m = useMutation({
    mutationFn: () => {
      const cuerpo: Record<string, unknown> = { ...d }
      if (!d.password) delete cuerpo.password
      return inicial ? api.patch(`usuarios/${inicial.id}/`, cuerpo) : api.post('usuarios/', cuerpo)
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['usuarios'] }); avisar(inicial ? 'Usuario actualizado.' : 'Usuario creado.'); cerrar() },
    onError: (e) => avisar(e.message, 'error'),
  })
  const toggle = (id: number) => setD({ ...d, programas: d.programas.includes(id) ? d.programas.filter((x) => x !== id) : [...d.programas, id] })
  const valido = d.email && d.first_name && d.last_name && (inicial || d.password.length >= 8)
  return (
    <Modal abierto cerrar={cerrar} titulo={inicial ? `Editar ${inicial.nombre}` : 'Nuevo usuario'} ancho="max-w-2xl" pie={<>
      <button className="btn-secundario" onClick={cerrar}>Cancelar</button>
      <button className="btn-primario" disabled={!valido || m.isPending} onClick={() => m.mutate()}>Guardar</button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombres *"><input className="campo" value={d.first_name} onChange={(e) => setD({ ...d, first_name: e.target.value })} /></Campo>
        <Campo etiqueta="Apellidos *"><input className="campo" value={d.last_name} onChange={(e) => setD({ ...d, last_name: e.target.value })} /></Campo>
        <Campo etiqueta="Correo institucional *"><input type="email" className="campo" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} placeholder="nombre@ucc.edu.co" /></Campo>
        <Campo etiqueta="Cargo"><input className="campo" value={d.cargo} onChange={(e) => setD({ ...d, cargo: e.target.value })} /></Campo>
        <div className="sm:col-span-2">
          <Campo etiqueta="Perfil" ayuda={ROLES.find((r) => r.valor === d.rol)?.ayuda}>
            <select className="campo" value={d.rol} onChange={(e) => setD({ ...d, rol: e.target.value as Rol })}>
              {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.texto}</option>)}
            </select>
          </Campo>
        </div>
        {!global && (
          <fieldset className="sm:col-span-2">
            <legend className="etiqueta">Programas a los que tiene acceso</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {progs?.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={d.programas.includes(p.id)} onChange={() => toggle(p.id)} />{p.nombre}</label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="sm:col-span-2">
          <Campo etiqueta={inicial ? 'Nueva contraseña (opcional)' : 'Contraseña *'} ayuda="Mínimo 8 caracteres; no puede ser común ni solo numérica">
            <input type="password" autoComplete="new-password" className="campo" value={d.password} onChange={(e) => setD({ ...d, password: e.target.value })} />
          </Campo>
        </div>
      </div>
    </Modal>
  )
}

export default function Usuarios() {
  const { usuario: yo } = useSesion()
  const qc = useQueryClient()
  const avisar = useAvisos()
  const [form, setForm] = useState<Usuario | true | null>(null)
  const [texto, setTexto] = useState('')
  const q = useQuery({ queryKey: ['usuarios'], queryFn: () => api.get<Usuario[]>('usuarios/') })
  const activar = useMutation({
    mutationFn: (u: Usuario) => api.post<Usuario>(`usuarios/${u.id}/activar/`),
    onSuccess: (u) => { void qc.invalidateQueries({ queryKey: ['usuarios'] }); avisar(u.is_active ? 'Usuario activado.' : 'Usuario desactivado. Reasigne sus indicadores, evidencias y planes pendientes.') },
    onError: (e) => avisar(e.message, 'error'),
  })
  const t = texto.toLowerCase()
  const lista = (q.data ?? []).filter((u) => !t || u.nombre.toLowerCase().includes(t) || u.email.includes(t))
  return (
    <>
      <Encabezado titulo="Gestión de usuarios" subtitulo={`${q.data?.length ?? 0} usuarios registrados`} acciones={<button className="btn-primario" onClick={() => setForm(true)}><Plus className="size-4" /> Nuevo usuario</button>} />
      <label className="relative mb-4 block max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input className="campo pl-9" placeholder="Buscar por nombre o correo…" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar usuario" />
      </label>
      {q.isLoading && <Cargando />}
      {q.error && <MensajeError error={q.error} />}
      {q.data && (
        <TablaContenedor>
          <table className="tabla">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Perfil</th><th>Programas</th><th>Último ingreso</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} className={u.is_active ? '' : 'opacity-60'}>
                  <td><div className="flex items-center gap-2"><Avatar iniciales={u.iniciales} chico /><div><div className="font-medium">{u.nombre}</div><div className="text-xs text-slate-500">{u.cargo}</div></div></div></td>
                  <td className="text-slate-600">{u.email}</td>
                  <td className="whitespace-nowrap">{u.rol_display}</td>
                  <td className="text-slate-600">{u.programas_nombres.join(', ') || '—'}</td>
                  <td className="whitespace-nowrap text-xs text-slate-500">{fechaHora(u.last_login)}</td>
                  <td><Insignia clase={u.is_active ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-slate-100 text-slate-600 ring-slate-300'}>{u.is_active ? 'Activo' : 'Inactivo'}</Insignia></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-secundario btn-chico" onClick={() => setForm(u)}><Pencil className="size-3.5" /> Editar</button>
                      {u.id !== yo?.id && <button className="btn-secundario btn-chico" disabled={activar.isPending}
                        onClick={() => (u.is_active ? window.confirm(`¿Desactivar a ${u.nombre}? No podrá ingresar al sistema.`) : true) && activar.mutate(u)}>{u.is_active ? 'Desactivar' : 'Activar'}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablaContenedor>
      )}
      {form && <FormularioUsuario inicial={form === true ? undefined : form} cerrar={() => setForm(null)} />}
    </>
  )
}
