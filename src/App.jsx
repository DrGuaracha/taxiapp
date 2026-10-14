import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'

export default function App() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('inicio') // 'inicio', 'finanzas', 'flota', 'documentos', 'perfil'

  // Estado para el Modo Oscuro (se guarda en localStorage)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })

  const [vehiculos, setVehiculos] = useState([])
  const [transacciones, setTransacciones] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [conductores, setConductores] = useState([])
  
  // Resumen financiero
  const [producidoHoy, setProducidoHoy] = useState(0)
  const [gastosHoy, setGastosHoy] = useState(0)
  const [producidoMes, setProducidoMes] = useState(0)
  const [gastosMes, setGastosMes] = useState(0)
  const [alertasCount, setAlertasCount] = useState(0)

  // Estados Perfil de Usuario
  const [perfilNombre, setPerfilNombre] = useState('')
  const [perfilAvatarUrl, setPerfilAvatarUrl] = useState('')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  // Estados formularios
  const [placa, setPlaca] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')

  const [nombreConductor, setNombreConductor] = useState('')
  const [telefonoConductor, setTelefonoConductor] = useState('')
  const [turnoConductor, setTurnoConductor] = useState('Día')
  const [vehiculoConductorSel, setVehiculoConductorSel] = useState('')

  // Producido con fecha personalizable
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState('')
  const [monto, setMonto] = useState('')
  const [fechaProducido, setFechaProducido] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')

  // Gasto / Mantenimiento con fecha personalizable
  const [vehiculoGastoSeleccionado, setVehiculoGastoSeleccionado] = useState('')
  const [montoGasto, setMontoGasto] = useState('')
  const [fechaGasto, setFechaGasto] = useState(new Date().toISOString().split('T')[0])
  const [categoriaGasto, setCategoriaGasto] = useState('Cambio de Aceite')
  const [obsGasto, setObsGasto] = useState('')

  // Filtros para el historial de mantenimientos
  const [filtroMantenimientoTexto, setFiltroMantenimientoTexto] = useState('')
  const [filtroMantenimientoCategoria, setFiltroMantenimientoCategoria] = useState('TODAS')
  const [filtroMantenimientoMes, setFiltroMantenimientoMes] = useState('TODOS')

  // Documento
  const [vehiculoDocSeleccionado, setVehiculoDocSeleccionado] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState('SOAT')
  const [fechaVencimiento, setFechaVencimiento] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        setPerfilNombre(session.user.user_metadata?.full_name || '')
        setPerfilAvatarUrl(session.user.user_metadata?.avatar_url || '')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        setPerfilNombre(session.user.user_metadata?.full_name || '')
        setPerfilAvatarUrl(session.user.user_metadata?.avatar_url || '')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      obtenerDatos()
    }
  }, [session])

  // Guardar preferencia de modo oscuro
  function toggleDarkMode() {
    const nuevoModo = !darkMode
    setDarkMode(nuevoModo)
    localStorage.setItem('darkMode', nuevoModo)
  }

  async function obtenerDatos() {
    const { data: vData } = await supabase.from('vehiculos').select('*').order('id', { ascending: false })
    setVehiculos(vData || [])
    if (vData && vData.length > 0) {
      setVehiculoSeleccionado(vData[0].id)
      setVehiculoGastoSeleccionado(vData[0].id)
      setVehiculoDocSeleccionado(vData[0].id)
      setVehiculoConductorSel(vData[0].id)
    }

    const { data: cData } = await supabase
      .from('conductores')
      .select('*, vehiculos(placa)')
      .order('id', { ascending: false })
    setConductores(cData || [])

    const { data: tData } = await supabase
      .from('transacciones')
      .select('*, vehiculos(placa)')
      .order('fecha', { ascending: false })
    setTransacciones(tData || [])

    const { data: dData } = await supabase
      .from('documentos')
      .select('*, vehiculos(placa)')
      .order('fecha_vencimiento', { ascending: true })
    setDocumentos(dData || [])

    const hoyStr = new Date().toISOString().split('T')[0]
    const mesActualStr = hoyStr.substring(0, 7)

    const totalProdHoy = (tData || [])
      .filter(t => t.fecha === hoyStr && t.tipo_movimiento === 'producido')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)
    setProducidoHoy(totalProdHoy)

    const totalGastHoy = (tData || [])
      .filter(t => t.fecha === hoyStr && t.tipo_movimiento === 'gasto')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)
    setGastosHoy(totalGastHoy)

    const totalProdMes = (tData || [])
      .filter(t => t.fecha && t.fecha.startsWith(mesActualStr) && t.tipo_movimiento === 'producido')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)
    setProducidoMes(totalProdMes)

    const totalGastMes = (tData || [])
      .filter(t => t.fecha && t.fecha.startsWith(mesActualStr) && t.tipo_movimiento === 'gasto')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)
    setGastosMes(totalGastMes)

    const hoy = new Date()
    let alertas = 0
    ;(dData || []).forEach(doc => {
      const fVenc = new Date(doc.fecha_vencimiento)
      const diffDias = Math.ceil((fVenc - hoy) / (1000 * 60 * 60 * 24))
      if (diffDias <= 15) alertas++
    })
    setAlertasCount(alertas)
  }

  async function actualizarPerfil(e) {
    e.preventDefault()
    setGuardandoPerfil(true)

    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: perfilNombre,
        avatar_url: perfilAvatarUrl
      }
    })

    setGuardandoPerfil(false)

    if (error) {
      alert('Error al actualizar perfil: ' + error.message)
    } else {
      alert('¡Perfil actualizado con éxito!')
      if (data.user) setSession({ ...session, user: data.user })
    }
  }

  async function agregarVehiculo(e) {
    e.preventDefault()
    if (!placa) return alert('Ingresa la placa')

    const { error } = await supabase
      .from('vehiculos')
      .insert([{ placa: placa.toUpperCase(), marca, modelo, estado: 'Activo', usuario_id: session.user.id }])

    if (error) alert('Error: ' + error.message)
    else {
      setPlaca('')
      setMarca('')
      setModelo('')
      obtenerDatos()
    }
  }

  async function cambiarEstadoVehiculo(id, nuevoEstado) {
    const { error } = await supabase
      .from('vehiculos')
      .update({ estado: nuevoEstado })
      .eq('id', id)

    if (error) alert('Error actualizando estado: ' + error.message)
    else obtenerDatos()
  }

  async function eliminarVehiculo(id, placaVehiculo) {
    if (!confirm(`¿Estás seguro de eliminar el taxi con placa ${placaVehiculo}?`)) return

    const { error } = await supabase.from('vehiculos').delete().eq('id', id)

    if (error) {
      alert('No se pudo eliminar el vehículo. Si tiene transacciones o documentos asociados, primero elimina sus registros.')
    } else {
      obtenerDatos()
    }
  }

  async function agregarConductor(e) {
    e.preventDefault()
    if (!nombreConductor) return alert('Ingresa el nombre del conductor')

    const { error } = await supabase.from('conductores').insert([{
      nombre: nombreConductor,
      telefono: telefonoConductor,
      turno: turnoConductor,
      vehiculo_id: vehiculoConductorSel || null
    }])

    if (error) alert('Error guardando conductor: ' + error.message)
    else {
      setNombreConductor('')
      setTelefonoConductor('')
      obtenerDatos()
    }
  }

  async function eliminarConductor(id, nombre) {
    if (!confirm(`¿Estás seguro de eliminar al conductor ${nombre}?`)) return

    const { error } = await supabase.from('conductores').delete().eq('id', id)

    if (error) alert('Error al eliminar conductor: ' + error.message)
    else obtenerDatos()
  }

  async function registrarProducido(e) {
    e.preventDefault()
    if (!vehiculoSeleccionado || !monto) return alert('Selecciona un taxi y el monto')

    const { error } = await supabase.from('transacciones').insert([{
      vehiculo_id: vehiculoSeleccionado,
      tipo_movimiento: 'producido',
      monto: Number(monto),
      fecha: fechaProducido,
      estado_pago: 'Pagado',
      observaciones
    }])

    if (error) alert('Error: ' + error.message)
    else {
      setMonto('')
      setObservaciones('')
      obtenerDatos()
    }
  }

  async function registrarGasto(e) {
    e.preventDefault()
    if (!vehiculoGastoSeleccionado || !montoGasto) return alert('Selecciona un taxi y el monto')

    const { error } = await supabase.from('transacciones').insert([{
      vehiculo_id: vehiculoGastoSeleccionado,
      tipo_movimiento: 'gasto',
      categoria_gasto: categoriaGasto,
      monto: Number(montoGasto),
      fecha: fechaGasto,
      observaciones: obsGasto
    }])

    if (error) alert('Error guardando gasto: ' + error.message)
    else {
      setMontoGasto('')
      setObsGasto('')
      obtenerDatos()
    }
  }

  async function registrarDocumento(e) {
    e.preventDefault()
    if (!vehiculoDocSeleccionado || !fechaVencimiento) return alert('Diligencia todos los campos')

    const { data: existente } = await supabase
      .from('documentos')
      .select('id')
      .eq('vehiculo_id', vehiculoDocSeleccionado)
      .eq('tipo_documento', tipoDocumento)

    let error = null

    if (existente && existente.length > 0) {
      const res = await supabase
        .from('documentos')
        .update({ fecha_vencimiento: fechaVencimiento })
        .eq('id', existente[0].id)
      error = res.error
    } else {
      const res = await supabase.from('documentos').insert([{
        vehiculo_id: vehiculoDocSeleccionado,
        tipo_documento: tipoDocumento,
        fecha_vencimiento: fechaVencimiento
      }])
      error = res.error
    }

    if (error) alert('Error: ' + error.message)
    else {
      setFechaVencimiento('')
      obtenerDatos()
      alert('¡Documento actualizado correctamente!')
    }
  }

  async function eliminarDocumento(id) {
    if (!confirm('¿Deseas eliminar este registro de documento?')) return

    const { error } = await supabase.from('documentos').delete().eq('id', id)
    if (error) alert('Error eliminando documento: ' + error.message)
    else obtenerDatos()
  }

  function getEstadoDocumento(fechaStr) {
    const hoy = new Date()
    const fVenc = new Date(fechaStr)
    const diffDias = Math.ceil((fVenc - hoy) / (1000 * 60 * 60 * 24))

    if (diffDias < 0) return { texto: 'Vencido', color: darkMode ? 'bg-red-900/50 text-red-300 border-red-700' : 'bg-red-100 text-red-800 border-red-300' }
    if (diffDias <= 15) return { texto: `Vence en ${diffDias} días`, color: darkMode ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700' : 'bg-yellow-100 text-yellow-800 border-yellow-300' }
    return { texto: 'Al día', color: darkMode ? 'bg-green-900/50 text-green-300 border-green-700' : 'bg-green-100 text-green-800 border-green-300' }
  }

  const mesesDisponibles = Array.from(
    new Set(
      transacciones
        .filter(t => t.fecha)
        .map(t => t.fecha.substring(0, 7))
    )
  ).sort().reverse()

  const resumenMesAMes = mesesDisponibles.map((mes) => {
    const producidosMes = transacciones
      .filter(t => t.fecha && t.fecha.startsWith(mes) && t.tipo_movimiento === 'producido')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)

    const gastosMes = transacciones
      .filter(t => t.fecha && t.fecha.startsWith(mes) && t.tipo_movimiento === 'gasto')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)

    return {
      mes,
      producido: producidosMes,
      gastos: gastosMes,
      gananciaNeta: producidosMes - gastosMes
    }
  })

  const producidosPorFecha = transacciones
    .filter(t => t.tipo_movimiento === 'producido')
    .reduce((acc, curr) => {
      const f = curr.fecha || 'Sin Fecha'
      if (!acc[f]) acc[f] = []
      acc[f].push(curr)
      return acc
    }, {})

  const mantenimientosFiltrados = transacciones.filter(t => {
    if (t.tipo_movimiento !== 'gasto') return false

    if (filtroMantenimientoMes !== 'TODOS' && (!t.fecha || !t.fecha.startsWith(filtroMantenimientoMes))) {
      return false
    }

    if (filtroMantenimientoCategoria !== 'TODAS' && t.categoria_gasto !== filtroMantenimientoCategoria) {
      return false
    }

    if (filtroMantenimientoTexto.trim() !== '') {
      const query = filtroMantenimientoTexto.toLowerCase()
      const placaStr = (t.vehiculos?.placa || '').toLowerCase()
      const obsStr = (t.observaciones || '').toLowerCase()
      const catStr = (t.categoria_gasto || '').toLowerCase()

      if (!placaStr.includes(query) && !obsStr.includes(query) && !catStr.includes(query)) {
        return false
      }
    }

    return true
  })

  const mantenimientosPorFecha = mantenimientosFiltrados.reduce((acc, curr) => {
    const f = curr.fecha || 'Sin Fecha'
    if (!acc[f]) acc[f] = []
    acc[f].push(curr)
    return acc
  }, {})

  if (!session) return <Auth />

  const usuarioNombre = session.user?.user_metadata?.full_name || session.user?.email?.split('@')[0]
  const usuarioAvatar = session.user?.user_metadata?.avatar_url

  // Clases dinámicas según modo oscuro / claro
  const bgMain = darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-100 text-gray-900'
  const bgCard = darkMode ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500'
  const inputClass = darkMode ? 'w-full p-2.5 border rounded-lg bg-gray-800 border-gray-700 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-yellow-400' : 'w-full p-2.5 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-yellow-400'
  const selectClass = darkMode ? 'w-full p-2.5 border rounded-lg bg-gray-800 border-gray-700 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-yellow-400' : 'w-full p-2.5 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-yellow-400'
  const rowClass = darkMode ? 'p-3 border rounded-lg bg-gray-800/60 border-gray-800 flex justify-between items-center text-sm' : 'p-3 border rounded-lg bg-gray-50 flex justify-between items-center text-sm'

  return (
    <div className={`min-h-screen p-3 sm:p-6 font-sans pb-20 transition-colors duration-200 ${bgMain}`}>
      
      {/* ENCABEZADO */}
      <header className={`max-w-5xl mx-auto mb-4 flex justify-between items-center p-4 rounded-xl shadow-md ${darkMode ? 'bg-yellow-500 text-gray-950' : 'bg-yellow-400 text-gray-900'}`}>
        <div className="flex items-center space-x-3">
          <div 
            onClick={() => setTab('perfil')}
            className="w-11 h-11 rounded-full bg-gray-900 text-yellow-400 font-extrabold flex items-center justify-center cursor-pointer overflow-hidden border-2 border-gray-900 shadow-sm"
          >
            {usuarioAvatar ? (
              <img src={usuarioAvatar} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <span>{usuarioNombre.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-extrabold">🚕 Gestión de Taxis</h1>
            <p className="text-xs font-medium opacity-90">
              Hola, <span className="font-bold">{usuarioNombre}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* BOTÓN MODO OSCURO / CLARO */}
          <button
            onClick={toggleDarkMode}
            className="bg-gray-900 text-yellow-400 hover:bg-gray-800 p-2.5 rounded-lg text-xs font-bold transition shadow"
            title="Cambiar Modo"
          >
            {darkMode ? '☀️ Claro' : '🌙 Oscuro'}
          </button>

          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs px-3 py-2.5 rounded-lg transition"
          >
            Salir
          </button>
        </div>
      </header>

      {/* MENÚ DE NAVEGACIÓN (TABS) */}
      <nav className={`max-w-5xl mx-auto mb-6 flex overflow-x-auto p-1 rounded-xl shadow space-x-1 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button
          onClick={() => setTab('inicio')}
          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition whitespace-nowrap ${
            tab === 'inicio' ? (darkMode ? 'bg-yellow-500 text-gray-950 shadow-sm' : 'bg-yellow-400 text-gray-900 shadow-sm') : (darkMode ? 'text-gray-400 hover:text-gray-100' : 'text-gray-500 hover:text-gray-900')
          }`}
        >
          📊 Inicio
        </button>
        <button
          onClick={() => setTab('finanzas')}
          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition whitespace-nowrap ${
            tab === 'finanzas' ? (darkMode ? 'bg-yellow-500 text-gray-950 shadow-sm' : 'bg-yellow-400 text-gray-900 shadow-sm') : (darkMode ? 'text-gray-400 hover:text-gray-100' : 'text-gray-500 hover:text-gray-900')
          }`}
        >
          💵 Movimientos
        </button>
        <button
          onClick={() => setTab('flota')}
          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition whitespace-nowrap ${
            tab === 'flota' ? (darkMode ? 'bg-yellow-500 text-gray-950 shadow-sm' : 'bg-yellow-400 text-gray-900 shadow-sm') : (darkMode ? 'text-gray-400 hover:text-gray-100' : 'text-gray-500 hover:text-gray-900')
          }`}
        >
          🚕 Flota
        </button>
        <button
          onClick={() => setTab('documentos')}
          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition whitespace-nowrap ${
            tab === 'documentos' ? (darkMode ? 'bg-yellow-500 text-gray-950 shadow-sm' : 'bg-yellow-400 text-gray-900 shadow-sm') : (darkMode ? 'text-gray-400 hover:text-gray-100' : 'text-gray-500 hover:text-gray-900')
          }`}
        >
          📄 Papeles
        </button>
        <button
          onClick={() => setTab('perfil')}
          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition whitespace-nowrap ${
            tab === 'perfil' ? (darkMode ? 'bg-yellow-500 text-gray-950 shadow-sm' : 'bg-yellow-400 text-gray-900 shadow-sm') : (darkMode ? 'text-gray-400 hover:text-gray-100' : 'text-gray-500 hover:text-gray-900')
          }`}
        >
          👤 Mi Perfil
        </button>
      </nav>

      <main className="max-w-5xl mx-auto space-y-6">

        {/* 1. PESTAÑA: INICIO / DASHBOARD PRINCIPAL */}
        {tab === 'inicio' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className={`p-4 rounded-xl shadow border-l-4 border-green-500 ${bgCard}`}>
                <p className={`text-xs font-semibold uppercase ${textMuted}`}>Producido Hoy</p>
                <p className="text-xl sm:text-2xl font-bold">${producidoHoy.toLocaleString()}</p>
              </div>
              <div className={`p-4 rounded-xl shadow border-l-4 border-emerald-600 ${bgCard}`}>
                <p className={`text-xs font-semibold uppercase ${textMuted}`}>Producido Mes</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-500">${producidoMes.toLocaleString()}</p>
              </div>
              <div className={`p-4 rounded-xl shadow border-l-4 border-blue-500 ${bgCard}`}>
                <p className={`text-xs font-semibold uppercase ${textMuted}`}>Ganancia Mes Neta</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-400">${(producidoMes - gastosMes).toLocaleString()}</p>
              </div>
              <div className={`p-4 rounded-xl shadow border-l-4 border-red-500 ${bgCard}`}>
                <p className={`text-xs font-semibold uppercase ${textMuted}`}>Alertas Papeles</p>
                <p className="text-xl sm:text-2xl font-bold text-red-500">{alertasCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-xl shadow ${bgCard}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold">🚕 Mis Taxis ({vehiculos.length})</h2>
                  <button onClick={() => setTab('flota')} className="text-xs text-yellow-400 font-bold hover:underline">
                    + Gestionar
                  </button>
                </div>
                {vehiculos.length === 0 ? (
                  <p className={`text-sm ${textMuted}`}>No hay taxis registrados. Ve a "Flota" para agregar uno.</p>
                ) : (
                  <div className="space-y-3">
                    {vehiculos.map((v) => (
                      <div key={v.id} className={rowClass}>
                        <div>
                          <span className="bg-yellow-400 text-gray-950 font-extrabold px-2.5 py-1 rounded text-sm tracking-wider">
                            {v.placa}
                          </span>
                          <p className={`text-xs mt-1 ${textMuted}`}>{v.marca ? `${v.marca} ${v.modelo || ''}` : 'Taxi activo'}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          v.estado === 'Activo' ? 'bg-green-900/50 text-green-300' :
                          v.estado === 'En Taller' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-red-900/50 text-red-300'
                        }`}>
                          {v.estado || 'Activo'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`p-6 rounded-xl shadow ${bgCard}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold">📋 Movimientos Recientes</h2>
                  <button onClick={() => setTab('finanzas')} className="text-xs text-yellow-400 font-bold hover:underline">
                    + Registrar
                  </button>
                </div>
                {transacciones.length === 0 ? (
                  <p className={`text-sm ${textMuted}`}>No hay movimientos aún.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {transacciones.slice(0, 5).map((t) => (
                      <div key={t.id} className={rowClass}>
                        <div>
                          <span className="font-bold">
                            {t.vehiculos?.placa || 'N/A'} - {t.tipo_movimiento === 'producido' ? 'Ingreso' : (t.categoria_gasto || 'Gasto')}
                          </span>
                          <p className={`text-xs ${textMuted}`}>{t.observaciones || 'Sin detalles'} ({t.fecha})</p>
                        </div>
                        <span className={`font-bold text-sm ${t.tipo_movimiento === 'producido' ? 'text-green-400' : 'text-red-400'}`}>
                          {t.tipo_movimiento === 'producido' ? '+' : '-'}${Number(t.monto).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. PESTAÑA: FINANZAS Y MOVIMIENTOS */}
        {tab === 'finanzas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-5 rounded-xl shadow border-t-4 border-green-500 ${bgCard}`}>
                <h2 className="text-base font-bold mb-3">💵 Registrar Producido Diario</h2>
                <form onSubmit={registrarProducido} className="space-y-3">
                  <select
                    value={vehiculoSeleccionado}
                    onChange={(e) => setVehiculoSeleccionado(e.target.value)}
                    className={selectClass}
                  >
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id} className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Placa: {v.placa}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Monto (ej: 120000)"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      className={inputClass}
                      required
                    />
                    <input
                      type="date"
                      value={fechaProducido}
                      onChange={(e) => setFechaProducido(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Obs: Turno día / Noche"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className={inputClass}
                  />

                  <button
                    type="submit"
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Guardar Producido
                  </button>
                </form>
              </div>

              <div className={`p-5 rounded-xl shadow border-t-4 border-purple-500 ${bgCard}`}>
                <h2 className="text-base font-bold mb-3">🛠️ Registrar Mantenimiento / Gasto</h2>
                <form onSubmit={registrarGasto} className="space-y-3">
                  <select
                    value={vehiculoGastoSeleccionado}
                    onChange={(e) => setVehiculoGastoSeleccionado(e.target.value)}
                    className={selectClass}
                  >
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id} className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Placa: {v.placa}</option>
                    ))}
                  </select>

                  <select
                    value={categoriaGasto}
                    onChange={(e) => setCategoriaGasto(e.target.value)}
                    className={selectClass}
                  >
                    <option value="Cambio de Aceite" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Cambio de Aceite</option>
                    <option value="Repuestos / Piezas" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Repuestos / Piezas</option>
                    <option value="Taller / Mano de Obra" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Taller / Mano de Obra</option>
                    <option value="Llantas / Frenos" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Llantas / Frenos</option>
                    <option value="Lavado / Otros" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Lavado / Otros</option>
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Costo (ej: 85000)"
                      value={montoGasto}
                      onChange={(e) => setMontoGasto(e.target.value)}
                      className={inputClass}
                      required
                    />
                    <input
                      type="date"
                      value={fechaGasto}
                      onChange={(e) => setFechaGasto(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Obs: Filtro de aceite y lubricante"
                    value={obsGasto}
                    onChange={(e) => setObsGasto(e.target.value)}
                    className={inputClass}
                  />

                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Guardar Mantenimiento
                  </button>
                </form>
              </div>
            </div>

            <div className={`p-6 rounded-xl shadow border-t-4 border-blue-600 ${bgCard}`}>
              <h2 className="text-lg font-bold mb-4">📈 Resumen de Ganancias Mes a Mes</h2>
              {resumenMesAMes.length === 0 ? (
                <p className={`text-sm ${textMuted}`}>No hay registros de transacciones para mostrar el historial mensual.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {resumenMesAMes.map((item) => (
                    <div key={item.mes} className={`p-4 border rounded-xl shadow-sm space-y-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="font-extrabold text-sm">📆 Mes: {item.mes}</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className={`flex justify-between ${textMuted}`}>
                          <span>Producido Total:</span>
                          <span className="font-bold text-green-400">+${item.producido.toLocaleString()}</span>
                        </div>
                        <div className={`flex justify-between ${textMuted}`}>
                          <span>Gastos / Mantenimiento:</span>
                          <span className="font-bold text-red-400">-${item.gastos.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm font-black border-t pt-2 mt-1">
                          <span>Ganancia Neta:</span>
                          <span className={item.gananciaNeta >= 0 ? 'text-blue-400' : 'text-red-400'}>
                            ${item.gananciaNeta.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`p-6 rounded-xl shadow ${bgCard}`}>
              <h2 className="text-lg font-bold mb-4">📅 Conteo de Producidos Día a Día</h2>
              {Object.keys(producidosPorFecha).length === 0 ? (
                <p className={`text-sm ${textMuted}`}>No hay producidos registrados aún.</p>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {Object.entries(producidosPorFecha).map(([fecha, lista]) => {
                    const totalDia = lista.reduce((a, c) => a + Number(c.monto), 0)
                    return (
                      <div key={fecha} className={`border rounded-xl p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-center border-b pb-2 mb-3">
                          <span className="font-extrabold text-sm">📆 Fecha: {fecha}</span>
                          <span className="bg-green-900/50 text-green-300 font-black text-sm px-3 py-1 rounded-full border border-green-700">
                            Total Producido: ${totalDia.toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {lista.map((item) => (
                            <div key={item.id} className={rowClass}>
                              <span className="font-bold">Placa: {item.vehiculos?.placa || 'N/A'}</span>
                              <span className={textMuted}>{item.observaciones || 'Sin notas'}</span>
                              <span className="font-bold text-green-400">+${Number(item.monto).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={`p-6 rounded-xl shadow border-t-4 border-purple-500 ${bgCard}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h2 className="text-lg font-bold">🛠️ Historial de Mantenimientos y Repuestos</h2>
                <span className="text-xs text-purple-300 font-bold bg-purple-900/50 px-2.5 py-1 rounded-full border border-purple-700">
                  {mantenimientosFiltrados.length} registro(s) encontrado(s)
                </span>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-purple-50 border-purple-100'}`}>
                <div>
                  <label className="block text-xs font-bold mb-1">🔍 Buscar Nota o Placa</label>
                  <input
                    type="text"
                    placeholder="Ej: pastillas, WPO841..."
                    value={filtroMantenimientoTexto}
                    onChange={(e) => setFiltroMantenimientoTexto(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">🏷️ Categoría</label>
                  <select
                    value={filtroMantenimientoCategoria}
                    onChange={(e) => setFiltroMantenimientoCategoria(e.target.value)}
                    className={selectClass}
                  >
                    <option value="TODAS" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Todas las categorías</option>
                    <option value="Cambio de Aceite" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Cambio de Aceite</option>
                    <option value="Repuestos / Piezas" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Repuestos / Piezas</option>
                    <option value="Taller / Mano de Obra" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Taller / Mano de Obra</option>
                    <option value="Llantas / Frenos" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Llantas / Frenos</option>
                    <option value="Lavado / Otros" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Lavado / Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">📅 Mes / Período</label>
                  <select
                    value={filtroMantenimientoMes}
                    onChange={(e) => setFiltroMantenimientoMes(e.target.value)}
                    className={selectClass}
                  >
                    <option value="TODOS" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Todos los meses</option>
                    {mesesDisponibles.map((m) => (
                      <option key={m} value={m} className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Mes: {m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {Object.keys(mantenimientosPorFecha).length === 0 ? (
                <p className={`text-sm py-4 text-center ${textMuted}`}>
                  {filtroMantenimientoTexto || filtroMantenimientoCategoria !== 'TODAS' || filtroMantenimientoMes !== 'TODOS'
                    ? 'No se encontraron mantenimientos con los filtros aplicados.'
                    : 'No hay mantenimientos o repuestos registrados aún.'}
                </p>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {Object.entries(mantenimientosPorFecha).map(([fecha, lista]) => {
                    const totalGastoDia = lista.reduce((a, c) => a + Number(c.monto), 0)
                    return (
                      <div key={fecha} className={`border rounded-xl p-4 ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-purple-50/40'}`}>
                        <div className="flex justify-between items-center border-b border-purple-700 pb-2 mb-3">
                          <span className="font-extrabold text-sm">📆 Fecha Mantenimiento: {fecha}</span>
                          <span className="bg-purple-900/50 text-purple-300 font-black text-xs sm:text-sm px-3 py-1 rounded-full border border-purple-700">
                            Subtotal: ${totalGastoDia.toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {lista.map((item) => (
                            <div key={item.id} className={rowClass}>
                              <div>
                                <span className="font-bold">Placa: {item.vehiculos?.placa || 'N/A'}</span>
                                <span className="ml-2 px-2 py-0.5 text-xs bg-purple-900/50 text-purple-300 font-bold rounded-md border border-purple-700">
                                  {item.categoria_gasto || 'Mantenimiento'}
                                </span>
                              </div>
                              <span className={`italic text-xs ${textMuted}`}>{item.observaciones || 'Sin detalles'}</span>
                              <span className="font-bold text-red-400">-${Number(item.monto).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. PESTAÑA: FLOTA Y PERSONAL */}
        {tab === 'flota' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-xl shadow border-t-4 border-yellow-400 ${bgCard}`}>
                <h2 className="text-lg font-bold mb-4">➕ Agregar Nuevo Taxi</h2>
                <form onSubmit={agregarVehiculo} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Placa (ej: WPO841)"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value)}
                    className={inputClass + ' uppercase'}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Marca (ej: Kia)"
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Modelo (ej: 2018)"
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Guardar Taxi
                  </button>
                </form>
              </div>

              <div className={`p-6 rounded-xl shadow border-t-4 border-orange-400 ${bgCard}`}>
                <h2 className="text-lg font-bold mb-4">👤 Registrar Conductor</h2>
                <form onSubmit={agregarConductor} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre Completo"
                      value={nombreConductor}
                      onChange={(e) => setNombreConductor(e.target.value)}
                      className={inputClass}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Teléfono / Célular"
                      value={telefonoConductor}
                      onChange={(e) => setTelefonoConductor(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={turnoConductor}
                      onChange={(e) => setTurnoConductor(e.target.value)}
                      className={selectClass}
                    >
                      <option value="Día" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Turno Día</option>
                      <option value="Noche" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Turno Noche</option>
                      <option value="24 Horas" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>24 Horas</option>
                    </select>

                    <select
                      value={vehiculoConductorSel}
                      onChange={(e) => setVehiculoConductorSel(e.target.value)}
                      className={selectClass}
                    >
                      <option value="" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Sin taxi asignado</option>
                      {vehiculos.map((v) => (
                        <option key={v.id} value={v.id} className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Asignar a Placa: {v.placa}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Guardar Conductor
                  </button>
                </form>
              </div>
            </div>

            <div className={`p-6 rounded-xl shadow ${bgCard}`}>
              <h2 className="text-lg font-bold mb-4">🚕 Administrar Vehículos ({vehiculos.length})</h2>
              {vehiculos.length === 0 ? (
                <p className={`text-sm ${textMuted}`}>No hay vehículos registrados.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {vehiculos.map((v) => (
                    <div key={v.id} className={`p-4 border rounded-xl flex justify-between items-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50'}`}>
                      <div>
                        <span className="bg-yellow-400 text-gray-950 font-extrabold px-3 py-1 rounded text-sm tracking-wider">
                          {v.placa}
                        </span>
                        <p className={`text-xs mt-2 ${textMuted}`}>{v.marca ? `${v.marca} ${v.modelo || ''}` : 'Taxi sin detalles'}</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <select
                          value={v.estado || 'Activo'}
                          onChange={(e) => cambiarEstadoVehiculo(v.id, e.target.value)}
                          className={`text-xs font-bold p-1.5 border rounded-lg outline-none ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white'}`}
                        >
                          <option value="Activo">🟢 Activo</option>
                          <option value="En Taller">🟡 En Taller</option>
                          <option value="Inactivo">🔴 Inactivo</option>
                        </select>

                        <button
                          onClick={() => eliminarVehiculo(v.id, v.placa)}
                          className="bg-red-900/50 hover:bg-red-900 text-red-300 p-1.5 rounded-lg text-xs font-bold transition border border-red-700"
                          title="Eliminar vehículo"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`p-6 rounded-xl shadow ${bgCard}`}>
              <h2 className="text-lg font-bold mb-4">👨‍✈️ Administrar Conductores ({conductores.length})</h2>
              {conductores.length === 0 ? (
                <p className={`text-sm ${textMuted}`}>No hay conductores registrados aún.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {conductores.map((c) => (
                    <div key={c.id} className={rowClass}>
                      <div>
                        <span className="font-bold">{c.nombre}</span>
                        <p className={`text-xs mt-0.5 ${textMuted}`}>
                          {c.telefono ? `Tel: ${c.telefono}` : 'Sin teléfono'} | Turno: {c.turno}
                        </p>
                        <span className="inline-block mt-1 bg-orange-900/50 text-orange-300 text-xs px-2 py-0.5 rounded font-semibold border border-orange-700">
                          {c.vehiculos?.placa ? `Placa: ${c.vehiculos.placa}` : 'Sin Taxi Asignado'}
                        </span>
                      </div>

                      <button
                        onClick={() => eliminarConductor(c.id, c.nombre)}
                        className="bg-red-900/50 hover:bg-red-900 text-red-300 p-2 rounded-lg text-xs font-bold transition border border-red-700"
                        title="Eliminar conductor"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. PESTAÑA: DOCUMENTACIÓN */}
        {tab === 'documentos' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-xl shadow border-t-4 border-blue-500 max-w-xl mx-auto ${bgCard}`}>
              <h2 className="text-lg font-bold mb-1">📄 Actualizar / Registrar Vencimiento Papeles</h2>
              <p className={`text-xs mb-4 ${textMuted}`}>Si ya existe el documento para esta placa, se actualizará la fecha sin duplicarse.</p>
              
              <form onSubmit={registrarDocumento} className="space-y-3">
                <select
                  value={vehiculoDocSeleccionado}
                  onChange={(e) => setVehiculoDocSeleccionado(e.target.value)}
                  className={selectClass}
                >
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id} className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Placa: {v.placa}</option>
                  ))}
                </select>

                <select
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  className={selectClass}
                >
                  <option value="SOAT" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>SOAT</option>
                  <option value="Tecnomecánica" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Tecnomecánica</option>
                  <option value="Póliza Contractual" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Póliza Contractual</option>
                  <option value="Tarjeta de Operación" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Tarjeta de Operación</option>
                </select>

                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  className={inputClass}
                  required
                />

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg text-sm transition"
                >
                  Actualizar / Guardar Documento
                </button>
              </form>
            </div>

            <div className={`p-6 rounded-xl shadow ${bgCard}`}>
              <h2 className="text-lg font-bold mb-4">📄 Estado de Documentos Registrados</h2>
              {documentos.length === 0 ? (
                <p className={`text-sm ${textMuted}`}>No hay documentos registrados aún.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documentos.map((d) => {
                    const estado = getEstadoDocumento(d.fecha_vencimiento)
                    return (
                      <div key={d.id} className={rowClass}>
                        <div>
                          <span className="font-bold">
                            {d.vehiculos?.placa || 'N/A'} - {d.tipo_documento}
                          </span>
                          <p className={`text-xs ${textMuted}`}>Vence: {d.fecha_vencimiento}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${estado.color}`}>
                            {estado.texto}
                          </span>
                          <button
                            onClick={() => eliminarDocumento(d.id)}
                            className="text-xs bg-red-900/50 hover:bg-red-900 text-red-300 p-1.5 rounded-lg transition border border-red-700"
                            title="Eliminar registro"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. PESTAÑA: MI PERFIL */}
        {tab === 'perfil' && (
          <div className={`max-w-xl mx-auto p-6 rounded-xl shadow border-t-4 border-gray-900 space-y-6 ${bgCard}`}>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gray-900 text-yellow-400 font-black text-2xl flex items-center justify-center overflow-hidden border-4 border-yellow-400 shadow">
                {perfilAvatarUrl ? (
                  <img src={perfilAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(perfilNombre || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <h2 className="text-xl font-bold">{usuarioNombre}</h2>
              <p className={`text-xs ${textMuted}`}>{session.user?.email}</p>
            </div>

            <form onSubmit={actualizarPerfil} className={`space-y-4 pt-2 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <div>
                <label className="block text-xs font-bold mb-1">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Tu Nombre"
                  value={perfilNombre}
                  onChange={(e) => setPerfilNombre(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">URL Foto de Perfil (Opcional)</label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/mi-foto.jpg"
                  value={perfilAvatarUrl}
                  onChange={(e) => setPerfilAvatarUrl(e.target.value)}
                  className={inputClass + ' text-xs'}
                />
                <p className={`text-[11px] mt-1 ${textMuted}`}>
                  Puedes pegar el enlace de cualquier imagen pública de internet.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={session.user?.email || ''}
                  disabled
                  className={`w-full p-2.5 border rounded-lg text-sm cursor-not-allowed ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
                />
                <p className={`text-[11px] mt-1 ${textMuted}`}>El correo está vinculado a la autenticación de Supabase.</p>
              </div>

              <button
                type="submit"
                disabled={guardandoPerfil}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-extrabold p-3 rounded-lg text-sm transition shadow-sm"
              >
                {guardandoPerfil ? 'Guardando...' : '💾 Guardar Cambios de Perfil'}
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  )
}