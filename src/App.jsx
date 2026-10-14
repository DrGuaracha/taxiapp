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

  // Estado Modal Edición de Conductor
  const [editandoConductor, setEditandoConductor] = useState(null)
  const [editCondNombre, setEditCondNombre] = useState('')
  const [editCondTelefono, setEditCondTelefono] = useState('')
  const [editCondTurno, setEditCondTurno] = useState('Día')
  const [editCondVehiculoId, setEditCondVehiculoId] = useState('')

  // Producido con fecha personalizable y opción Pico y Placa
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState('')
  const [monto, setMonto] = useState('')
  const [fechaProducido, setFechaProducido] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')
  const [esPicoYPlaca, setEsPicoYPlaca] = useState(false)

  // Estado Modal Edición de Producido
  const [editandoProducido, setEditandoProducido] = useState(null)
  const [editProdVehiculoId, setEditProdVehiculoId] = useState('')
  const [editProdMonto, setEditProdMonto] = useState('')
  const [editProdFecha, setEditProdFecha] = useState('')
  const [editProdObs, setEditProdObs] = useState('')
  const [editProdEsPicoYPlaca, setEditProdEsPicoYPlaca] = useState(false)

  // Gasto / Mantenimiento con fecha personalizable
  const [vehiculoGastoSeleccionado, setVehiculoGastoSeleccionado] = useState('')
  const [montoGasto, setMontoGasto] = useState('')
  const [fechaGasto, setFechaGasto] = useState(new Date().toISOString().split('T')[0])
  const [categoriaGasto, setCategoriaGasto] = useState('Cambio de Aceite')
  const [obsGasto, setObsGasto] = useState('')

  // Estado Modal Edición de Mantenimiento / Gasto
  const [editandoGasto, setEditandoGasto] = useState(null)
  const [editVehiculoId, setEditVehiculoId] = useState('')
  const [editMonto, setEditMonto] = useState('')
  const [editFecha, setEditFecha] = useState('')
  const [editCategoria, setEditCategoria] = useState('')
  const [editObs, setEditObs] = useState('')

  // Estado para el Calendario de Producidos (Año y Mes actual)
  const [fechaCalendario, setFechaCalendario] = useState(new Date())
  const [diaSeleccionadoModal, setDiaSeleccionadoModal] = useState(null)

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

  // ABRIR MODAL EDICIÓN CONDUCTOR
  function abrirEdicionConductor(c) {
    setEditandoConductor(c)
    setEditCondNombre(c.nombre)
    setEditCondTelefono(c.telefono || '')
    setEditCondTurno(c.turno || 'Día')
    setEditCondVehiculoId(c.vehiculo_id || '')
  }

  // GUARDAR EDICIÓN CONDUCTOR
  async function guardarEdicionConductor(e) {
    e.preventDefault()
    if (!editandoConductor) return

    const { error } = await supabase
      .from('conductores')
      .update({
        nombre: editCondNombre,
        telefono: editCondTelefono,
        turno: editCondTurno,
        vehiculo_id: editCondVehiculoId || null
      })
      .eq('id', editandoConductor.id)

    if (error) {
      alert('Error actualizando conductor: ' + error.message)
    } else {
      alert('¡Conductor actualizado correctamente!')
      setEditandoConductor(null)
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
    if (!vehiculoSeleccionado) return alert('Selecciona un taxi')
    if (!esPicoYPlaca && (!monto || Number(monto) < 0)) return alert('Ingresa un monto válido o selecciona Pico y Placa')

    const { data: existente, error: errConsulta } = await supabase
      .from('transacciones')
      .select('id, monto, observaciones')
      .eq('vehiculo_id', vehiculoSeleccionado)
      .eq('tipo_movimiento', 'producido')
      .eq('fecha', fechaProducido)

    if (errConsulta) {
      alert('Error verificando duplicados: ' + errConsulta.message)
      return
    }

    const vehiculoObj = vehiculos.find(v => v.id === Number(vehiculoSeleccionado) || v.id === vehiculoSeleccionado)
    const placaTexto = vehiculoObj ? vehiculoObj.placa : 'este taxi'

    if (existente && existente.length > 0) {
      alert(`⚠️ ADVERTENCIA: Ya existe un registro para la placa ${placaTexto} en la fecha ${fechaProducido}.\n\nNo se puede registrar doble vez.`)
      return
    }

    const montoFinal = esPicoYPlaca ? 0 : Number(monto)
    const obsFinal = esPicoYPlaca 
      ? (observaciones ? `Pico y Placa - ${observaciones}` : 'Pico y Placa') 
      : observaciones

    const { error } = await supabase.from('transacciones').insert([{
      vehiculo_id: vehiculoSeleccionado,
      tipo_movimiento: 'producido',
      monto: montoFinal,
      fecha: fechaProducido,
      estado_pago: 'Pagado',
      observaciones: obsFinal
    }])

    if (error) alert('Error: ' + error.message)
    else {
      setMonto('')
      setObservaciones('')
      setEsPicoYPlaca(false)
      obtenerDatos()
      alert(esPicoYPlaca ? '¡Pico y Placa registrado con éxito!' : '¡Producido registrado con éxito!')
    }
  }

  function abrirEdicionProducido(item) {
    setEditandoProducido(item)
    setEditProdVehiculoId(item.vehiculo_id)
    setEditProdMonto(item.monto)
    setEditProdFecha(item.fecha)
    const esPyP = (item.observaciones || '').toLowerCase().includes('pico y placa')
    setEditProdEsPicoYPlaca(esPyP)
    setEditProdObs(item.observaciones ? item.observaciones.replace(/^Pico y Placa\s*-\s*/i, '').replace(/^Pico y Placa$/i, '') : '')
  }

  async function guardarEdicionProducido(e) {
    e.preventDefault()
    if (!editandoProducido) return

    const montoFinal = editProdEsPicoYPlaca ? 0 : Number(editProdMonto)
    const obsFinal = editProdEsPicoYPlaca 
      ? (editProdObs ? `Pico y Placa - ${editProdObs}` : 'Pico y Placa') 
      : editProdObs

    const { error } = await supabase
      .from('transacciones')
      .update({
        vehiculo_id: editProdVehiculoId,
        monto: montoFinal,
        fecha: editProdFecha,
        observaciones: obsFinal
      })
      .eq('id', editandoProducido.id)

    if (error) {
      alert('Error al actualizar producido: ' + error.message)
    } else {
      alert('¡Producido actualizado correctamente!')
      setEditandoProducido(null)
      setDiaSeleccionadoModal(null)
      obtenerDatos()
    }
  }

  async function eliminarProducido(id, placa) {
    if (!confirm(`¿Estás seguro de eliminar el registro de producido para la placa ${placa}?`)) return

    const { error } = await supabase.from('transacciones').delete().eq('id', id)

    if (error) {
      alert('Error al eliminar producido: ' + error.message)
    } else {
      alert('Registro eliminado correctamente')
      setDiaSeleccionadoModal(null)
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

  function abrirEdicionMantenimiento(item) {
    setEditandoGasto(item)
    setEditVehiculoId(item.vehiculo_id)
    setEditMonto(item.monto)
    setEditFecha(item.fecha)
    setEditCategoria(item.categoria_gasto || 'Cambio de Aceite')
    setEditObs(item.observaciones || '')
  }

  async function guardarEdicionMantenimiento(e) {
    e.preventDefault()
    if (!editandoGasto) return

    const { error } = await supabase
      .from('transacciones')
      .update({
        vehiculo_id: editVehiculoId,
        monto: Number(editMonto),
        fecha: editFecha,
        categoria_gasto: editCategoria,
        observaciones: editObs
      })
      .eq('id', editandoGasto.id)

    if (error) {
      alert('Error al actualizar mantenimiento: ' + error.message)
    } else {
      alert('¡Mantenimiento actualizado correctamente!')
      setEditandoGasto(null)
      obtenerDatos()
    }
  }

  async function eliminarMantenimiento(id) {
    if (!confirm('¿Estás seguro de eliminar este registro de mantenimiento / gasto?')) return

    const { error } = await supabase.from('transacciones').delete().eq('id', id)

    if (error) {
      alert('Error al eliminar el mantenimiento: ' + error.message)
    } else {
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

  // Funciones de ayuda para el Calendario
  const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  function cambiarMesCalendario(direccion) {
    const nuevaFecha = new Date(fechaCalendario)
    nuevaFecha.setMonth(nuevaFecha.getMonth() + direccion)
    setFechaCalendario(nuevaFecha)
  }

  const añoActualCal = fechaCalendario.getFullYear()
  const mesActualCal = fechaCalendario.getMonth()
  const primerDiaMes = new Date(añoActualCal, mesActualCal, 1).getDay()
  const primerDiaAjustado = primerDiaMes === 0 ? 6 : primerDiaMes - 1
  const totalDiasMes = new Date(añoActualCal, mesActualCal + 1, 0).getDate()

  const producidosPorFechaMap = transacciones
    .filter(t => t.tipo_movimiento === 'producido')
    .reduce((acc, curr) => {
      const f = curr.fecha
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

  // Calcular el total invertido en mantenimientos en el mes actual
  const hoyStr = new Date().toISOString().split('T')[0]
  const mesActualStr = hoyStr.substring(0, 7)
  const totalMantenimientosMes = transacciones
    .filter(t => t.tipo_movimiento === 'gasto' && t.fecha && t.fecha.startsWith(mesActualStr))
    .reduce((acc, curr) => acc + Number(curr.monto), 0)

  const mantenimientosPorFecha = mantenimientosFiltrados.reduce((acc, curr) => {
    const f = curr.fecha || 'Sin Fecha'
    if (!acc[f]) acc[f] = []
    acc[f].push(curr)
    return acc
  }, {})

  if (!session) return <Auth />

  const usuarioNombre = session.user?.user_metadata?.full_name || session.user?.email?.split('@')[0]
  const usuarioAvatar = session.user?.user_metadata?.avatar_url

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

                  <label className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition ${esPicoYPlaca ? 'bg-blue-900/40 border-blue-500 text-blue-300' : (darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200')}`}>
                    <input
                      type="checkbox"
                      checked={esPicoYPlaca}
                      onChange={(e) => {
                        setEsPicoYPlaca(e.target.checked)
                        if (e.target.checked) setMonto('0')
                        else setMonto('')
                      }}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold">🚘 Es Pico y Placa (Producido $0)</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Monto (ej: 120000)"
                      value={monto}
                      disabled={esPicoYPlaca}
                      onChange={(e) => setMonto(e.target.value)}
                      className={`${inputClass} ${esPicoYPlaca ? 'opacity-50 cursor-not-allowed' : ''}`}
                      required={!esPicoYPlaca}
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
                    placeholder={esPicoYPlaca ? "Obs opcional (ej: Restricción todo el día)" : "Obs: Turno día / Noche"}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className={inputClass}
                  />

                  <button
                    type="submit"
                    className={`w-full font-bold p-2.5 rounded-lg text-sm transition text-white ${esPicoYPlaca ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-500 hover:bg-green-600'}`}
                  >
                    {esPicoYPlaca ? 'Guardar Pico y Placa ($0)' : 'Guardar Producido'}
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

            {/* CALENDARIO DE PRODUCIDOS DÍA A DÍA */}
            <div className={`p-6 rounded-xl shadow border-t-4 border-green-500 ${bgCard}`}>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <h2 className="text-lg font-bold">📅 Calendario de Producción Diaria</h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => cambiarMesCalendario(-1)}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 text-yellow-400 font-bold hover:bg-gray-700 text-xs transition"
                  >
                    ◀ Mes Anterior
                  </button>
                  <span className="font-black text-sm uppercase tracking-wider">
                    {nombresMeses[mesActualCal]} {añoActualCal}
                  </span>
                  <button
                    onClick={() => cambiarMesCalendario(1)}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 text-yellow-400 font-bold hover:bg-gray-700 text-xs transition"
                  >
                    Mes Siguiente ▶
                  </button>
                </div>
              </div>

              {/* Leyenda */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-4 text-xs font-semibold">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block shadow"></span>
                  <span>Trabajado</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shadow"></span>
                  <span>Pico y Placa</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow"></span>
                  <span>Sin Trabajar / Sin registro</span>
                </div>
              </div>

              {/* Cuadrícula de Días de la Semana */}
              <div className="grid grid-cols-7 gap-2 text-center mb-2 font-bold text-xs">
                <span className={textMuted}>Lun</span>
                <span className={textMuted}>Mar</span>
                <span className={textMuted}>Mié</span>
                <span className={textMuted}>Jue</span>
                <span className={textMuted}>Vie</span>
                <span className={textMuted}>Sáb</span>
                <span className={textMuted}>Dom</span>
              </div>

              {/* Días del Mes */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: primerDiaAjustado }).map((_, index) => (
                  <div key={`empty-${index}`} className="h-16 sm:h-20 rounded-xl bg-transparent"></div>
                ))}

                {Array.from({ length: totalDiasMes }).map((_, index) => {
                  const diaNum = index + 1
                  const mesStr = String(mesActualCal + 1).padStart(2, '0')
                  const diaStr = String(diaNum).padStart(2, '0')
                  const fechaStr = `${añoActualCal}-${mesStr}-${diaStr}`

                  const registrosDia = producidosPorFechaMap[fechaStr] || []
                  const totalDia = registrosDia.reduce((a, c) => a + Number(c.monto), 0)
                  
                  const esDiaPicoYPlaca = registrosDia.some(r => (r.observaciones || '').toLowerCase().includes('pico y placa'))

                  const hoyFechaStr = new Date().toISOString().split('T')[0]
                  const esDiaPasadoOActual = fechaStr <= hoyFechaStr

                  let puntoColor = 'bg-gray-600'
                  let estadoBorde = darkMode ? 'border-gray-800 bg-gray-800/40' : 'border-gray-200 bg-gray-50'

                  if (totalDia > 0) {
                    puntoColor = 'bg-green-500 shadow-green-500/50 shadow-md'
                    estadoBorde = darkMode ? 'border-green-800/60 bg-green-950/20' : 'border-green-200 bg-green-50/50'
                  } else if (esDiaPicoYPlaca) {
                    puntoColor = 'bg-blue-500 shadow-blue-500/50 shadow-md'
                    estadoBorde = darkMode ? 'border-blue-800/60 bg-blue-950/30' : 'border-blue-200 bg-blue-50/60'
                  } else if (esDiaPasadoOActual) {
                    puntoColor = 'bg-red-500 shadow-red-500/50 shadow-md'
                    estadoBorde = darkMode ? 'border-red-900/40 bg-red-950/10' : 'border-red-100 bg-red-50/30'
                  }

                  return (
                    <div
                      key={fechaStr}
                      onClick={() => setDiaSeleccionadoModal({ fecha: fechaStr, registros: registrosDia, total: totalDia, esPicoYPlaca: esDiaPicoYPlaca })}
                      className={`h-16 sm:h-20 p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition transform hover:scale-105 ${estadoBorde}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-xs sm:text-sm">{diaNum}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${puntoColor}`}></span>
                      </div>
                      <div className="text-right">
                        {totalDia > 0 ? (
                          <span className="text-[10px] sm:text-xs font-black text-green-400 block truncate">
                            ${totalDia.toLocaleString()}
                          </span>
                        ) : esDiaPicoYPlaca ? (
                          <span className="text-[9px] sm:text-[10px] font-black text-blue-400 block truncate">
                            🚘 Pico y Placa
                          </span>
                        ) : (
                          <span className={`text-[10px] ${textMuted} block`}>$0</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* HISTORIAL DE MANTENIMIENTOS (CON TOTAL INVERTIDO EN EL MES) */}
            <div className={`p-6 rounded-xl shadow border-t-4 border-purple-500 ${bgCard}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold">🛠️ Historial de Mantenimientos y Repuestos</h2>
                  <p className={`text-xs mt-0.5 ${textMuted}`}>Total invertido este mes: <span className="font-black text-red-400">${totalMantenimientosMes.toLocaleString()}</span></p>
                </div>
                <span className="text-xs text-purple-300 font-bold bg-purple-900/50 px-3 py-1.5 rounded-full border border-purple-700 shadow-sm">
                  Inversión Mes: ${totalMantenimientosMes.toLocaleString()}
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
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-red-400">-${Number(item.monto).toLocaleString()}</span>
                                <button
                                  onClick={() => abrirEdicionMantenimiento(item)}
                                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-950 px-2 py-1 rounded text-xs font-bold transition shadow-sm"
                                  title="Editar este mantenimiento"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => eliminarMantenimiento(item.id)}
                                  className="bg-red-900/50 hover:bg-red-900 text-red-300 px-2 py-1 rounded text-xs font-bold transition border border-red-700 shadow-sm"
                                  title="Eliminar este mantenimiento"
                                >
                                  🗑️
                                </button>
                              </div>
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

        {/* MODAL DETALLE DE DÍA SELECCIONADO EN CALENDARIO */}
        {diaSeleccionadoModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border space-y-4 ${bgCard}`}>
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-base font-extrabold">📅 Detalle del Día</h3>
                  <p className={`text-xs ${textMuted}`}>{diaSeleccionadoModal.fecha}</p>
                </div>
                <button
                  onClick={() => setDiaSeleccionadoModal(null)}
                  className="text-gray-400 hover:text-gray-100 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="flex justify-between items-center bg-gray-800/30 p-3 rounded-xl border">
                <span className="text-sm font-bold">Total Producido:</span>
                <span className="text-base font-black text-green-400">${diaSeleccionadoModal.total.toLocaleString()}</span>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase mb-2 text-gray-400">Taxis Registrados en esta fecha:</h4>
                {diaSeleccionadoModal.registros.length === 0 ? (
                  <p className={`text-sm italic py-4 text-center ${textMuted}`}>No hay registros en este día (Día en rojo / sin producción).</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {diaSeleccionadoModal.registros.map(item => {
                      const esPicoPlacaItem = (item.observaciones || '').toLowerCase().includes('pico y placa')
                      const placaTaxi = item.vehiculos?.placa || 'N/A'
                      return (
                        <div key={item.id} className={rowClass}>
                          <div>
                            <span className="font-bold">Placa: {placaTaxi}</span>
                            <p className={`text-xs ${textMuted}`}>{item.observaciones || 'Sin notas'}</p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {esPicoPlacaItem ? (
                              <span className="font-bold text-xs bg-blue-900/60 text-blue-300 px-2.5 py-1 rounded-full border border-blue-700">
                                🚘 Pico y Placa ($0)
                              </span>
                            ) : (
                              <span className="font-bold text-green-400">+${Number(item.monto).toLocaleString()}</span>
                            )}

                            <button
                              onClick={() => abrirEdicionProducido(item)}
                              className="bg-yellow-400 hover:bg-yellow-500 text-gray-950 px-2 py-1 rounded text-xs font-bold transition shadow-sm"
                              title="Editar este producido"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => eliminarProducido(item.id, placaTaxi)}
                              className="bg-red-900/50 hover:bg-red-900 text-red-300 px-2 py-1 rounded text-xs font-bold transition border border-red-700 shadow-sm"
                              title="Eliminar este producido"
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

              <button
                onClick={() => setDiaSeleccionadoModal(null)}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold p-2.5 rounded-lg text-sm transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* MODAL DE EDICIÓN DE PRODUCIDO */}
        {editandoProducido && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border ${bgCard}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">✏️ Editar Producido</h3>
                <button
                  onClick={() => setEditandoProducido(null)}
                  className="text-gray-400 hover:text-gray-100 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={guardarEdicionProducido} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Vehículo / Placa</label>
                  <select
                    value={editProdVehiculoId}
                    onChange={(e) => setEditProdVehiculoId(e.target.value)}
                    className={selectClass}
                  >
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id} className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Placa: {v.placa}</option>
                    ))}
                  </select>
                </div>

                <label className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition ${editProdEsPicoYPlaca ? 'bg-blue-900/40 border-blue-500 text-blue-300' : (darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200')}`}>
                  <input
                    type="checkbox"
                    checked={editProdEsPicoYPlaca}
                    onChange={(e) => {
                      setEditProdEsPicoYPlaca(e.target.checked)
                      if (e.target.checked) setEditProdMonto('0')
                    }}
                    className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold">🚘 Es Pico y Placa (Producido $0)</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">Monto ($)</label>
                    <input
                      type="number"
                      value={editProdMonto}
                      disabled={editProdEsPicoYPlaca}
                      onChange={(e) => setEditProdMonto(e.target.value)}
                      className={`${inputClass} ${editProdEsPicoYPlaca ? 'opacity-50 cursor-not-allowed' : ''}`}
                      required={!editProdEsPicoYPlaca}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Fecha</label>
                    <input
                      type="date"
                      value={editProdFecha}
                      onChange={(e) => setEditProdFecha(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Observaciones / Notas</label>
                  <input
                    type="text"
                    value={editProdObs}
                    onChange={(e) => setEditProdObs(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditandoProducido(null)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE EDICIÓN DE CONDUCTOR */}
        {editandoConductor && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border space-y-4 ${bgCard}`}>
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-extrabold">✏️ Editar Conductor</h3>
                <button
                  onClick={() => setEditandoConductor(null)}
                  className="text-gray-400 hover:text-gray-100 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={guardarEdicionConductor} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={editCondNombre}
                    onChange={(e) => setEditCondNombre(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={editCondTelefono}
                      onChange={(e) => setEditCondTelefono(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Turno</label>
                    <select
                      value={editCondTurno}
                      onChange={(e) => setEditCondTurno(e.target.value)}
                      className={selectClass}
                    >
                      <option value="Día" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Día</option>
                      <option value="Noche" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Noche</option>
                      <option value="24 Horas" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>24 Horas</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Asignar a Taxi</label>
                  <select
                    value={editCondVehiculoId}
                    onChange={(e) => setEditCondVehiculoId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Sin taxi asignado</option>
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id} className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Placa: {v.placa}</option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditandoConductor(null)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE EDICIÓN DE MANTENIMIENTO */}
        {editandoGasto && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border ${bgCard}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">✏️ Editar Mantenimiento</h3>
                <button
                  onClick={() => setEditandoGasto(null)}
                  className="text-gray-400 hover:text-gray-100 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={guardarEdicionMantenimiento} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Vehículo / Placa</label>
                  <select
                    value={editVehiculoId}
                    onChange={(e) => setEditVehiculoId(e.target.value)}
                    className={selectClass}
                  >
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id} className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Placa: {v.placa}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Categoría</label>
                  <select
                    value={editCategoria}
                    onChange={(e) => setEditCategoria(e.target.value)}
                    className={selectClass}
                  >
                    <option value="Cambio de Aceite" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Cambio de Aceite</option>
                    <option value="Repuestos / Piezas" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Repuestos / Piezas</option>
                    <option value="Taller / Mano de Obra" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Taller / Mano de Obra</option>
                    <option value="Llantas / Frenos" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Llantas / Frenos</option>
                    <option value="Lavado / Otros" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Lavado / Otros</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">Monto ($)</label>
                    <input
                      type="number"
                      value={editMonto}
                      onChange={(e) => setEditMonto(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Fecha</label>
                    <input
                      type="date"
                      value={editFecha}
                      onChange={(e) => setEditFecha(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Observaciones / Detalles</label>
                  <input
                    type="text"
                    value={editObs}
                    onChange={(e) => setEditObs(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditandoGasto(null)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
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

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => abrirEdicionConductor(c)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-gray-950 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                          title="Editar conductor"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => eliminarConductor(c.id, c.nombre)}
                          className="bg-red-900/50 hover:bg-red-900 text-red-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border border-red-700"
                          title="Eliminar conductor"
                        >
                          🗑️
                        </button>
                      </div>
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