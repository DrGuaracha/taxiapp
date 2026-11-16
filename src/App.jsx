import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'

// Función para obtener la fecha exacta en Colombia (YYYY-MM-DD)
const obtenerFechaColombia = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

// Trae TODAS las filas (Supabase corta en 1000 por consulta)
async function traerTodo(construirQuery) {
  const TAM = 1000
  let desde = 0
  let todo = []
  while (true) {
    const { data, error } = await construirQuery().range(desde, desde + TAM - 1)
    if (error) { console.error(error); break }
    todo = todo.concat(data || [])
    if (!data || data.length < TAM) break
    desde += TAM
  }
  return todo
}

// Días hasta una fecha 'YYYY-MM-DD', usando el día de Colombia (sin desfase UTC)
const diasHastaVencimiento = (fechaStr) => {
  const [a, m, d] = String(fechaStr).slice(0, 10).split('-').map(Number)
  const [ha, hm, hd] = obtenerFechaColombia().split('-').map(Number)
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / 86400000)
}

// Evita que textos con < > & rompan el reporte PDF
const escapeHtml = (txt) =>
  String(txt ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export default function App() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('inicio') // 'inicio', 'finanzas', 'flota', 'documentos', 'perfil'

  // Identificador de Admin Principal
  const CORREO_ADMIN = 'santitapias1611@gmail.com'

  // Estado para el Modo Oscuro (se guarda en localStorage)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })

  // Estado para activar o desactivar la vista de SuperAdmin
  const [modoSuperAdminActivo, setModoSuperAdminActivo] = useState(false)

  const [vehiculos, setVehiculos] = useState([])
  const [transacciones, setTransacciones] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [conductores, setConductores] = useState([])
  
  // Resumen financiero global (hoy y alertas)
  const [producidoHoy, setProducidoHoy] = useState(0)
  const [gastosHoy, setGastosHoy] = useState(0)
  const [alertasCount, setAlertasCount] = useState(0)
  const [documentosProximosVencer, setDocumentosProximosVencer] = useState([])

  // Lista de vehículos ocultos para el administrador (almacenado localmente)
  const [vehiculosOcultosAdmin, setVehiculosOcultosAdmin] = useState(() => {
    const saved = localStorage.getItem('vehiculosOcultosAdmin')
    return saved ? JSON.parse(saved) : []
  })

  // Estado para Modal Ver Detalle de Vehículo
  const [vehiculoDetalle, setVehiculoDetalle] = useState(null)

  // Estado Modal Edición de Vehículo
  const [editandoVehiculo, setEditandoVehiculo] = useState(null)
  const [editPlaca, setEditPlaca] = useState('')
  const [editMarca, setEditMarca] = useState('')
  const [editModelo, setEditModelo] = useState('')

  // Estado Compartir Vehículo
  const [correoCompartir, setCorreoCompartir] = useState('')
  const [compartiendoState, setCompartiendoState] = useState(false)

  // Estados Perfil de Usuario
  const [perfilNombre, setPerfilNombre] = useState('')
  const [perfilCorreo, setPerfilCorreo] = useState('')
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

  // Tarifa diaria con fecha personalizable, Pico y Placa, y Domingo o Festivo
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState('')
  const [monto, setMonto] = useState('')
  const [fechaProducido, setFechaProducido] = useState(obtenerFechaColombia())
  const [observaciones, setObservaciones] = useState('')
  const [esPicoYPlaca, setEsPicoYPlaca] = useState(false)
  const [esDomingoFestivo, setEsDomingoFestivo] = useState(false)

  // Estado Modal Edición de Tarifa
  const [editandoProducido, setEditandoProducido] = useState(null)
  const [editProdVehiculoId, setEditProdVehiculoId] = useState('')
  const [editProdMonto, setEditProdMonto] = useState('')
  const [editProdFecha, setEditProdFecha] = useState('')
  const [editProdObs, setEditProdObs] = useState('')
  const [editProdEsPicoYPlaca, setEditProdEsPicoYPlaca] = useState(false)
  const [editProdEsDomingoFestivo, setEditProdEsDomingoFestivo] = useState(false)

  // Gasto / Mantenimiento con fecha personalizable y factura
  const [vehiculoGastoSeleccionado, setVehiculoGastoSeleccionado] = useState('')
  const [montoGasto, setMontoGasto] = useState('')
  const [fechaGasto, setFechaGasto] = useState(obtenerFechaColombia())
  const [categoriaGasto, setCategoriaGasto] = useState('Cambio de Aceite')
  const [obsGasto, setObsGasto] = useState('')
  const [archivoFactura, setArchivoFactura] = useState(null)

  // Estados para Modal de Agregar/Cambiar Factura en registros existentes
  const [modalFacturaItem, setModalFacturaItem] = useState(null)
  const [nuevoArchivoFactura, setNuevoArchivoFactura] = useState(null)
  const [subiendoFacturaModal, setSubiendoFacturaModal] = useState(false)

  // Estado Modal Edición de Mantenimiento / Gasto
  const [editandoGasto, setEditandoGasto] = useState(null)
  const [editVehiculoId, setEditVehiculoId] = useState('')
  const [editMonto, setEditMonto] = useState('')
  const [editFecha, setEditFecha] = useState('')
  const [editCategoria, setEditCategoria] = useState('')
  const [editObs, setEditObs] = useState('')

  // Estado para el Calendario de Tarifas (Año y Mes actual)
  const [fechaCalendario, setFechaCalendario] = useState(new Date())
  const [diaSeleccionadoModal, setDiaSeleccionadoModal] = useState(null)

  // Estado para seleccionar el vehículo al exportar PDF ('TODOS' o el ID del vehículo)
  const [vehiculoFiltroPDF, setVehiculoFiltroPDF] = useState('TODOS')

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
        setPerfilCorreo(session.user.email || '')
        setPerfilNombre(session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || '')
        setPerfilAvatarUrl(session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        setPerfilCorreo(session.user.email || '')
        setPerfilNombre(session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || '')
        setPerfilAvatarUrl(session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      obtenerDatos()
    }
  }, [session, modoSuperAdminActivo])

  function toggleDarkMode() {
    const nuevoModo = !darkMode
    setDarkMode(nuevoModo)
    localStorage.setItem('darkMode', nuevoModo)
  }

  const esAdmin = session?.user?.email === CORREO_ADMIN

  async function obtenerDatos() {
    if (!session?.user) return

    const miCorreo = (session.user.email || '').toLowerCase().trim()

    // 1. Obtener vehículos que RLS permite ver en 'vehiculos'
    const { data: vData } = await supabase.from('vehiculos').select('*').order('id', { ascending: false })
    
    // 2. Obtener vehiculos compartidos específicamente buscando por el correo del usuario
    const { data: vCompartidosData } = await supabase
      .from('vehiculos_compartidos')
      .select('vehiculo_id, vehiculos(*)')
      .ilike('correo_invitado', miCorreo)

    const listaVehiculosCompartidos = (vCompartidosData || [])
      .map(item => item.vehiculos)
      .filter(Boolean)
      .map(v => ({ ...v, esCompartidoConmigo: true }))

    // IDs de los taxis que realmente me compartieron (para no mezclar los del modo SuperAdmin)
    const idsCompartidos = new Set(listaVehiculosCompartidos.map(v => v.id))

    // Unificar vehículos en un mapa para no tener duplicados
    const mapaVehiculos = new Map()

    ;(vData || []).forEach(v => {
      mapaVehiculos.set(v.id, {
        ...v,
        esCompartidoConmigo: v.usuario_id !== session.user.id
      })
    })

    listaVehiculosCompartidos.forEach(v => {
      if (!mapaVehiculos.has(v.id)) {
        mapaVehiculos.set(v.id, v)
      } else {
        mapaVehiculos.set(v.id, {
          ...mapaVehiculos.get(v.id),
          esCompartidoConmigo: v.usuario_id !== session.user.id
        })
      }
    })

    const todosLosVehiculos = Array.from(mapaVehiculos.values())
    
    // Filtro corregido: incluye propios, compartidos conmigo, o todos si el SuperAdmin está activo
    const vVisibles = (esAdmin && modoSuperAdminActivo)
      ? todosLosVehiculos.filter(v => !vehiculosOcultosAdmin.includes(v.id))
      : todosLosVehiculos.filter(
          v => (v.usuario_id === session.user.id || (v.esCompartidoConmigo && idsCompartidos.has(v.id))) && !vehiculosOcultosAdmin.includes(v.id)
        )
    
    setVehiculos(vVisibles)

    const idsVehiculosValidos = new Set(vVisibles.map(v => v.id))

    if (vVisibles.length > 0) {
      const conservar = (actual) =>
        vVisibles.some(v => String(v.id) === String(actual)) ? actual : vVisibles[0].id
      setVehiculoSeleccionado(conservar)
      setVehiculoGastoSeleccionado(conservar)
      setVehiculoDocSeleccionado(conservar)
      setVehiculoConductorSel(conservar)
    }

    const { data: cData } = await supabase
      .from('conductores')
      .select('*, vehiculos(placa)')
      .order('id', { ascending: false })
    setConductores(cData || [])

    const tData = await traerTodo(() =>
      supabase
        .from('transacciones')
        .select('*, vehiculos(placa)')
        .order('fecha', { ascending: false })
        .order('id', { ascending: false })
    )

    const transaccionesValidas = tData.filter(t => idsVehiculosValidos.has(t.vehiculo_id))
    setTransacciones(transaccionesValidas)

    const { data: dData } = await supabase
      .from('documentos')
      .select('*, vehiculos(placa)')
      .order('fecha_vencimiento', { ascending: true })

    const documentosValidos = (dData || []).filter(d => idsVehiculosValidos.has(d.vehiculo_id))
    setDocumentos(documentosValidos)

    const hoyStr = obtenerFechaColombia()

    const totalProdHoy = transaccionesValidas
      .filter(t => t.fecha === hoyStr && t.tipo_movimiento === 'producido')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)
    setProducidoHoy(totalProdHoy)

    const totalGastHoy = transaccionesValidas
      .filter(t => t.fecha === hoyStr && t.tipo_movimiento === 'gasto')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)
    setGastosHoy(totalGastHoy)

    let alertas = 0
    const docsUrgentes = []

    documentosValidos.forEach(doc => {
      const diffDias = diasHastaVencimiento(doc.fecha_vencimiento)
      if (diffDias <= 15) {
        alertas++
      }
      if (diffDias <= 5) {
        docsUrgentes.push({ ...doc, diasRestantes: diffDias })
      }
    })
    setAlertasCount(alertas)
    setDocumentosProximosVencer(docsUrgentes)
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

  function abrirEdicionVehiculo(v) {
    setEditandoVehiculo(v)
    setEditPlaca(v.placa)
    setEditMarca(v.marca || '')
    setEditModelo(v.modelo || '')
  }

  async function guardarEdicionVehiculo(e) {
    e.preventDefault()
    if (!editandoVehiculo) return

    const { error } = await supabase
      .from('vehiculos')
      .update({
        placa: editPlaca.toUpperCase(),
        marca: editMarca,
        modelo: editModelo
      })
      .eq('id', editandoVehiculo.id)

    if (error) {
      alert('Error al actualizar vehículo: ' + error.message)
    } else {
      alert('¡Características del vehículo actualizadas con éxito!')
      setEditandoVehiculo(null)
      if (vehiculoDetalle && vehiculoDetalle.id === editandoVehiculo.id) {
        setVehiculoDetalle({ ...vehiculoDetalle, placa: editPlaca.toUpperCase(), marca: editMarca, modelo: editModelo })
      }
      obtenerDatos()
    }
  }

  async function compartirVehiculo(e) {
    e.preventDefault()
    if (!correoCompartir.trim()) return alert('Ingresa el correo del usuario')
    if (!vehiculoDetalle) return

    setCompartiendoState(true)

    const { error } = await supabase
      .from('vehiculos_compartidos')
      .insert([{
        vehiculo_id: vehiculoDetalle.id,
        correo_invitado: correoCompartir.toLowerCase().trim(),
        propietario_id: session.user.id
      }])

    setCompartiendoState(false)

    if (error) {
      alert('No se pudo compartir. Verifica las políticas RLS en Supabase.\n\nError: ' + error.message)
    } else {
      alert(`¡Taxi con placa ${vehiculoDetalle.placa} compartido con éxito a ${correoCompartir.toLowerCase().trim()}!`)
      setCorreoCompartir('')
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

  async function eliminarVehiculo(v) {
    const esPropietarioDirecto = v.usuario_id === session.user.id
    const miCorreo = (session.user.email || '').toLowerCase().trim()

    // CASO 1: Si es un usuario invitado
    if (!esPropietarioDirecto && !esAdmin) {
      if (!confirm(`¿Deseas eliminar de tu perfil el taxi compartido (${v.placa})?\n\nNota: Esto solo quitará el vehículo de tu cuenta, no afectará al dueño original.`)) return

      const { error } = await supabase
        .from('vehiculos_compartidos')
        .delete()
        .eq('vehiculo_id', v.id)
        .ilike('correo_invitado', miCorreo)

      if (error) {
        alert('Error al desvincular el taxi compartido: ' + error.message)
      } else {
        alert(`Taxi ${v.placa} eliminado de tu perfil.`)
        obtenerDatos()
      }
      return
    }

    // CASO 2: MODO SUPERADMIN
    if (esAdmin && !esPropietarioDirecto) {
      const resp = confirm(`👑 MODO ADMINISTRADOR:\n¿Deseas quitar el vehículo ${v.placa} únicamente de tu vista sin afectar los datos del dueño original?`)
      if (resp) {
        const nuevosOcultos = [...vehiculosOcultosAdmin, v.id]
        setVehiculosOcultosAdmin(nuevosOcultos)
        localStorage.setItem('vehiculosOcultosAdmin', JSON.stringify(nuevosOcultos))
        alert(`Taxi ${v.placa} retirado de tu panel de administración.`)
        obtenerDatos()
      }
      return
    }

    // CASO 3: PROPIETARIO ELIMINA DEFINITIVAMENTE
    if (!confirm(`¿Estás seguro de eliminar permanentemente el taxi con placa ${v.placa}? Esta acción no se puede deshacer.`)) return

    const { error } = await supabase.from('vehiculos').delete().eq('id', v.id)

    if (error) {
      alert('No se pudo eliminar el vehículo. ' + error.message)
    } else {
      alert(`Taxi ${v.placa} eliminado por completo.`)
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

    let montoFinal = Number(monto)
    let etiquetaObs = ''

    if (esPicoYPlaca) {
      montoFinal = 0
      etiquetaObs = 'Pico y Placa'
    } else if (esDomingoFestivo) {
      etiquetaObs = 'Domingo o Festivo'
    }

    const obsFinal = etiquetaObs 
      ? (observaciones ? `${etiquetaObs} - ${observaciones}` : etiquetaObs) 
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
      setEsDomingoFestivo(false)
      obtenerDatos()
      alert(esPicoYPlaca ? '¡Pico y Placa registrado con éxito!' : '¡Tarifa registrada con éxito!')
    }
  }

  function abrirEdicionProducido(item) {
    setEditandoProducido(item)
    setEditProdVehiculoId(item.vehiculo_id)
    setEditProdMonto(item.monto)
    setEditProdFecha(item.fecha)
    const obsL = (item.observaciones || '').toLowerCase()
    const esPyP = obsL.includes('pico y placa')
    const esDom = obsL.includes('domingo o festivo')
    setEditProdEsPicoYPlaca(esPyP)
    setEditProdEsDomingoFestivo(esDom)
    setEditProdObs(item.observaciones ? item.observaciones.replace(/^Pico y Placa\s*-\s*/i, '').replace(/^Pico y Placa$/i, '').replace(/^Domingo o Festivo\s*-\s*/i, '').replace(/^Domingo o Festivo$/i, '') : '')
  }

  async function guardarEdicionProducido(e) {
    e.preventDefault()
    if (!editandoProducido) return

    let montoFinal = Number(editProdMonto)
    let etiquetaObs = ''

    if (editProdEsPicoYPlaca) {
      montoFinal = 0
      etiquetaObs = 'Pico y Placa'
    } else if (editProdEsDomingoFestivo) {
      etiquetaObs = 'Domingo o Festivo'
    }

    const obsFinal = etiquetaObs 
      ? (editProdObs ? `${etiquetaObs} - ${editProdObs}` : etiquetaObs) 
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
      alert('Error al actualizar tarifa: ' + error.message)
    } else {
      alert('¡Tarifa actualizada correctamente!')
      setEditandoProducido(null)
      setDiaSeleccionadoModal(null)
      obtenerDatos()
    }
  }

  async function eliminarProducido(id, placa) {
    if (!confirm(`¿Estás seguro de eliminar el registro de tarifa para la placa ${placa}?`)) return

    const { error } = await supabase.from('transacciones').delete().eq('id', id)

    if (error) {
      alert('Error al eliminar tarifa: ' + error.message)
    } else {
      alert('Registro eliminado correctamente')
      setDiaSeleccionadoModal(null)
      obtenerDatos()
    }
  }

  async function registrarGasto(e) {
    e.preventDefault()
    if (!vehiculoGastoSeleccionado || !montoGasto) return alert('Selecciona un taxi y el monto')

    let urlFacturaFinal = ''

    if (archivoFactura) {
      const nombreArchivo = `${Date.now()}_${archivoFactura.name.replace(/\s+/g, '_')}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('facturas-mantenimiento')
        .upload(nombreArchivo, archivoFactura)

      if (uploadError) {
        alert('Error al subir la factura: ' + uploadError.message)
        return
      }

      const { data: publicURLData } = supabase.storage
        .from('facturas-mantenimiento')
        .getPublicUrl(nombreArchivo)

      urlFacturaFinal = publicURLData.publicUrl
    }

    const { error } = await supabase.from('transacciones').insert([{
      vehiculo_id: vehiculoGastoSeleccionado,
      tipo_movimiento: 'gasto',
      categoria_gasto: categoriaGasto,
      monto: Number(montoGasto),
      fecha: fechaGasto,
      observaciones: obsGasto,
      url_factura: urlFacturaFinal
    }])

    if (error) alert('Error guardando gasto: ' + error.message)
    else {
      setMontoGasto('')
      setObsGasto('')
      setArchivoFactura(null)
      obtenerDatos()
      alert('¡Mantenimiento y factura guardados con éxito!')
    }
  }

  async function guardarFacturaModal(e) {
    e.preventDefault()
    if (!modalFacturaItem || !nuevoArchivoFactura) return alert('Selecciona una imagen')

    setSubiendoFacturaModal(true)

    try {
      const nombreArchivo = `${Date.now()}_${nuevoArchivoFactura.name.replace(/\s+/g, '_')}`
      const { error: uploadError } = await supabase.storage
        .from('facturas-mantenimiento')
        .upload(nombreArchivo, nuevoArchivoFactura)

      if (uploadError) {
        alert('Error al subir la factura: ' + uploadError.message)
        setSubiendoFacturaModal(false)
        return
      }

      const { data: publicURLData } = supabase.storage
        .from('facturas-mantenimiento')
        .getPublicUrl(nombreArchivo)

      const urlFacturaFinal = publicURLData.publicUrl

      const { error } = await supabase
        .from('transacciones')
        .update({ url_factura: urlFacturaFinal })
        .eq('id', modalFacturaItem.id)

      setSubiendoFacturaModal(false)

      if (error) {
        alert('Error al actualizar la transacción: ' + error.message)
      } else {
        alert('¡Factura agregada con éxito!')
        setModalFacturaItem(null)
        setNuevoArchivoFactura(null)
        obtenerDatos()
      }
    } catch (err) {
      setSubiendoFacturaModal(false)
      alert('Ocurrió un error: ' + err.message)
    }
  }

  async function eliminarFotoFactura(id, urlFactura) {
    if (!confirm('¿Deseas eliminar la foto de esta factura?')) return

    try {
      if (urlFactura) {
        const partesUrl = urlFactura.split('/facturas-mantenimiento/')
        if (partesUrl.length > 1) {
          const nombreArchivo = partesUrl[1]
          await supabase.storage.from('facturas-mantenimiento').remove([nombreArchivo])
        }
      }

      const { error } = await supabase
        .from('transacciones')
        .update({ url_factura: null })
        .eq('id', id)

      if (error) {
        alert('Error al desvincular la foto: ' + error.message)
      } else {
        alert('Foto de la factura eliminada correctamente')
        obtenerDatos()
      }
    } catch (err) {
      alert('Ocurrió un error al eliminar la foto: ' + err.message)
    }
  }

  function abrirEdicionMantenimiento(item) {
    setEditandoGasto(item)
    setEditVehiculoId(item.vehiculo_id)
    setEditMonto(item.monto)
    setEditFecha(item.fecha)
    setEditCategoria(item.categoria_gasto === 'Lavado / Otros' ? 'Otros' : (item.categoria_gasto || 'Cambio de Aceite'))
    setEditObs(item.observaciones || '')
  }

  async function guardarEdicionMantenimiento(e) {
    e.preventDefault()
    if (!editandoGasto) return

    const { data, error } = await supabase
      .from('transacciones')
      .update({
        vehiculo_id: editVehiculoId,
        monto: Number(editMonto),
        fecha: editFecha,
        categoria_gasto: editCategoria,
        observaciones: editObs
      })
      .eq('id', editandoGasto.id)
      .select()

    if (error) {
      alert('Error al actualizar mantenimiento: ' + error.message)
    } else if (!data || data.length === 0) {
      alert('⚠️ No se pudo actualizar el registro. Verifica los permisos de Supabase.')
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
    const diffDias = diasHastaVencimiento(fechaStr)

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

  // Mes seleccionado en el calendario sincronizado con las finanzas
  const mesSeleccionadoStr = `${añoActualCal}-${String(mesActualCal + 1).padStart(2, '0')}`

  const totalProdMesSel = transacciones
    .filter(t => t.fecha && t.fecha.startsWith(mesSeleccionadoStr) && t.tipo_movimiento === 'producido')
    .reduce((acc, curr) => acc + Number(curr.monto), 0)

  const totalGastMesSel = transacciones
    .filter(t => t.fecha && t.fecha.startsWith(mesSeleccionadoStr) && t.tipo_movimiento === 'gasto')
    .reduce((acc, curr) => acc + Number(curr.monto), 0)

  const gananciaNetaMesSel = totalProdMesSel - totalGastMesSel

  // Cálculo de la Ganancia Total del Año en curso (Año actual del sistema)
  const añoEnCursoStr = obtenerFechaColombia().slice(0, 4)
  const totalProdAnio = transacciones
    .filter(t => t.fecha && t.fecha.startsWith(añoEnCursoStr) && t.tipo_movimiento === 'producido')
    .reduce((acc, curr) => acc + Number(curr.monto), 0)
  const totalGastAnio = transacciones
    .filter(t => t.fecha && t.fecha.startsWith(añoEnCursoStr) && t.tipo_movimiento === 'gasto')
    .reduce((acc, curr) => acc + Number(curr.monto), 0)
  const gananciaTotalAnio = totalProdAnio - totalGastAnio

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

    if (filtroMantenimientoCategoria !== 'TODAS') {
      if (filtroMantenimientoCategoria === 'Otros') {
        if (t.categoria_gasto !== 'Otros' && t.categoria_gasto !== 'Lavado / Otros') return false
      } else if (t.categoria_gasto !== filtroMantenimientoCategoria) {
        return false
      }
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

  // Función para exportar el reporte financiero en PDF (Filtrando por mes y opcionalmente por vehículo)
  function exportarReportePDF() {
    const mesTexto = nombresMeses[mesActualCal] || 'Mes'
    const añoTexto = añoActualCal

    // Filtrar transacciones del mes y opcionalmente del vehículo seleccionado
    let tarifasMes = transacciones.filter(t => t.tipo_movimiento === 'producido' && t.fecha && t.fecha.startsWith(mesSeleccionadoStr))
    let gastosMesLista = transacciones.filter(t => t.tipo_movimiento === 'gasto' && t.fecha && t.fecha.startsWith(mesSeleccionadoStr))

    if (vehiculoFiltroPDF !== 'TODOS') {
      tarifasMes = tarifasMes.filter(t => String(t.vehiculo_id) === String(vehiculoFiltroPDF))
      gastosMesLista = gastosMesLista.filter(g => String(g.vehiculo_id) === String(vehiculoFiltroPDF))
    }

    const totalProd = tarifasMes.reduce((a, c) => a + Number(c.monto), 0)
    const totalGast = gastosMesLista.reduce((a, c) => a + Number(c.monto), 0)
    const gananciaNeta = totalProd - totalGast

    // Obtener subtítulo del vehículo si hay uno seleccionado
    let subtituloVehiculo = 'Todos los vehículos'
    if (vehiculoFiltroPDF !== 'TODOS') {
      const vObj = vehiculos.find(v => String(v.id) === String(vehiculoFiltroPDF))
      if (vObj) subtituloVehiculo = `Taxi Placa: ${vObj.placa}`
    }

    const ventana = window.open('', '_blank')
    if (!ventana) {
      alert('Tu navegador bloqueó la ventana emergente. Permítela e intenta de nuevo.')
      return
    }
    ventana.document.write(`
      <html>
        <head>
          <title>Reporte Financiero - ${mesTexto} ${añoTexto}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #eab308; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
            .summary-box { display: flex; justify-content: space-between; background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
            .stat { text-align: center; flex: 1; }
            .stat-title { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: bold; }
            .stat-value { font-size: 18px; font-weight: bold; margin-top: 4px; }
            .green { color: #16a34a; }
            .red { color: #dc2626; }
            .blue { color: #2563eb; }
            h3 { margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; font-size: 15px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚕 Reporte Financiero de Ganancias Netas</h1>
            <p>Período: <strong>${mesTexto} ${añoTexto}</strong> | Vehículo: <strong>${escapeHtml(subtituloVehiculo)}</strong> | Usuario: ${escapeHtml(usuarioNombre)}</p>
          </div>

          <div class="summary-box">
            <div class="stat">
              <div class="stat-title">Total Tarifas</div>
              <div class="stat-value green">$${totalProd.toLocaleString()}</div>
            </div>
            <div class="stat">
              <div class="stat-title">Total Mantenimientos</div>
              <div class="stat-value red">$${totalGast.toLocaleString()}</div>
            </div>
            <div class="stat">
              <div class="stat-title">Ganancia Neta</div>
              <div class="stat-value blue">$${gananciaNeta.toLocaleString()}</div>
            </div>
          </div>

          <h3>💵 Detalle de Tarifas (Producido) del Período</h3>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Placa</th>
                <th>Observaciones</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${tarifasMes.length === 0 ? '<tr><td colspan="4" style="text-align:center;">Sin tarifas registradas en este período</td></tr>' : 
                tarifasMes.map(t => `
                  <tr>
                    <td>${t.fecha}</td>
                    <td>${escapeHtml(t.vehiculos?.placa || 'N/A')}</td>
                    <td>${escapeHtml(t.observaciones || 'Tarifa normal')}</td>
                    <td style="color:#16a34a; font-weight:bold;">+$${Number(t.monto).toLocaleString()}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>

          <h3>🛠️ Detalle de Gastos y Mantenimientos del Período</h3>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Placa</th>
                <th>Categoría</th>
                <th>Observaciones</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${gastosMesLista.length === 0 ? '<tr><td colspan="5" style="text-align:center;">Sin gastos en este período</td></tr>' : 
                gastosMesLista.map(g => `
                  <tr>
                    <td>${g.fecha}</td>
                    <td>${escapeHtml(g.vehiculos?.placa || 'N/A')}</td>
                    <td>${escapeHtml(g.categoria_gasto || 'Gasto')}</td>
                    <td>${escapeHtml(g.observaciones || '-')}</td>
                    <td style="color:#dc2626; font-weight:bold;">-$${Number(g.monto).toLocaleString()}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>

          <div class="footer">
            Documento generado automáticamente por Gestión de Taxis - ${obtenerFechaColombia()}
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `)
    ventana.document.close()
  }

  if (!session) return <Auth />

  const usuarioNombre = perfilNombre || session.user?.user_metadata?.full_name || session.user?.email?.split('@')[0]
  const usuarioAvatar = perfilAvatarUrl || session.user?.user_metadata?.avatar_url || session.user?.user_metadata?.picture

  const bgMain = darkMode ? 'bg-gray-950 text-gray-100' : 'bg-[#F4F3EE] text-gray-900'
  const bgCard = darkMode ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500'
  const inputClass = darkMode ? 'w-full p-2.5 border rounded-lg bg-gray-800 border-gray-700 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-yellow-400' : 'w-full p-2.5 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-yellow-400'
  const selectClass = darkMode ? 'w-full p-2.5 border rounded-lg bg-gray-800 border-gray-700 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-yellow-400' : 'w-full p-2.5 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-yellow-400'
  const rowClass = darkMode ? 'p-3 border rounded-lg bg-gray-800/60 border-gray-800 flex justify-between items-center text-sm' : 'p-3 border rounded-lg bg-gray-50 flex justify-between items-center text-sm'

  const itemsMenu = [
    { id: 'inicio', largo: 'Inicio', corto: 'Inicio', icono: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /> },
    { id: 'finanzas', largo: 'Movimientos', corto: 'Finanzas', icono: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2" /></> },
    { id: 'flota', largo: 'Flota y conductores', corto: 'Flota', icono: <path d="M5 16l1.5-5a2 2 0 0 1 1.9-1.4h7.2A2 2 0 0 1 17.5 11L19 16M4 16h16v3H4zM7 19v1.5M17 19v1.5" /> },
    { id: 'documentos', largo: 'Documentos', corto: 'Docs', icono: <path d="M7 3h7l4 4v14H7zM14 3v4h4" /> },
    { id: 'perfil', largo: 'Mi perfil', corto: 'Perfil', icono: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></> },
  ]

  const titulosTab = {
    inicio: { titulo: 'Resumen de hoy', sub: 'Tu flota de un vistazo' },
    finanzas: { titulo: 'Movimientos', sub: 'Tarifas, mantenimientos y calendario' },
    flota: { titulo: 'Flota y conductores', sub: 'Tus taxis y quienes los manejan' },
    documentos: { titulo: 'Documentos y vencimientos', sub: 'SOAT, tecnomecánica y más' },
    perfil: { titulo: 'Mi perfil', sub: 'Tus datos y preferencias' },
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 md:flex ${bgMain}`}>
      
      {/* MENÚ LATERAL (COMPUTADOR) */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 sticky top-0 h-screen box-border bg-[#16181D] text-white p-5">
        <div className="text-xl font-extrabold leading-tight mb-6">
          Gestión<br /><span className="text-yellow-400">de Taxis</span>
        </div>

        <nav className="flex flex-col gap-1.5">
          {itemsMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`min-h-[44px] px-3.5 rounded-xl text-sm font-semibold text-left transition ${
                tab === item.id ? 'bg-yellow-400 text-gray-900' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              {item.largo}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-4 space-y-2">
          <button
            onClick={() => setTab('perfil')}
            className="flex items-center gap-3 w-full min-h-[44px] text-left"
          >
            <div className="w-10 h-10 rounded-full bg-yellow-400 text-gray-900 font-extrabold flex items-center justify-center overflow-hidden shrink-0">
              {usuarioAvatar ? (
                <img src={usuarioAvatar} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <span>{usuarioNombre.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="min-w-0 text-sm">
              <span className="block text-xs text-gray-400">Hola,</span>
              <span className="block font-bold truncate">{usuarioNombre}</span>
            </span>
          </button>

          {esAdmin && (
            <button
              onClick={() => setModoSuperAdminActivo(!modoSuperAdminActivo)}
              className={`w-full min-h-[44px] rounded-xl text-xs font-extrabold border transition ${
                modoSuperAdminActivo ? 'text-green-400 border-green-500' : 'text-yellow-400 border-gray-700'
              }`}
              title="Alternar vista de todos los vehículos o solo los míos"
            >
              {modoSuperAdminActivo ? '👑 Admin: ON' : '👑 Admin: OFF'}
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={toggleDarkMode}
              className="flex-1 min-h-[44px] rounded-xl text-xs font-bold text-yellow-400 border border-gray-700 hover:bg-white/10 transition"
            >
              {darkMode ? 'Modo claro' : 'Modo oscuro'}
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex-1 min-h-[44px] rounded-xl text-xs font-bold text-white border border-gray-700 hover:bg-white/10 transition"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 p-3 sm:p-6 md:p-8 pb-28 md:pb-8">

      {/* BARRA SUPERIOR (CELULAR) */}
      <header className="md:hidden max-w-6xl mx-auto mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-extrabold">Gestión de Taxis{esAdmin ? ' 👑' : ''}</div>
          <p className={`text-xs truncate ${textMuted}`}>
            Hola, <span className="font-bold">{usuarioNombre}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {esAdmin && (
            <button
              onClick={() => setModoSuperAdminActivo(!modoSuperAdminActivo)}
              className={`min-h-[44px] px-3 rounded-xl text-xs font-extrabold bg-[#16181D] border ${
                modoSuperAdminActivo ? 'text-green-400 border-green-500' : 'text-yellow-400 border-gray-700'
              }`}
            >
              {modoSuperAdminActivo ? 'Admin: ON' : 'Admin: OFF'}
            </button>
          )}
          <button
            onClick={toggleDarkMode}
            className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-[#16181D] text-yellow-400"
          >
            {darkMode ? 'Claro' : 'Oscuro'}
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-[#16181D] text-white"
          >
            Salir
          </button>
        </div>
      </header>

      {/* TÍTULO DE LA PÁGINA */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">{titulosTab[tab].titulo}</h1>
          <p className={`text-sm mt-1 ${textMuted}`}>{titulosTab[tab].sub}</p>
        </div>
        {tab === 'inicio' && (
          <button
            onClick={() => setTab('finanzas')}
            className="min-h-[44px] px-5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-semibold transition"
          >
            Registrar producido
          </button>
        )}
      </div>

      <main className="max-w-6xl mx-auto space-y-6">

        {/* 1. PESTAÑA: INICIO / DASHBOARD PRINCIPAL */}
        {tab === 'inicio' && (
          <div className="space-y-6">
            {documentosProximosVencer.length > 0 && (
              <div className="p-4 rounded-xl border bg-red-950/40 border-red-600 shadow-lg space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🚨</span>
                  <h3 className="text-sm font-black text-red-300 uppercase tracking-wide">¡Alerta Urgente: Documentos por Vencer!</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {documentosProximosVencer.map(doc => (
                    <div key={doc.id} className="p-2.5 bg-red-900/40 rounded-lg border border-red-700 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-extrabold text-white">Placa: {doc.vehiculos?.placa}</span>
                        <p className="text-red-200">{doc.tipo_documento} (Vence: {doc.fecha_vencimiento})</p>
                      </div>
                      <span className="bg-red-600 text-white font-bold px-2.5 py-1 rounded-full">
                        {doc.diasRestantes < 0 ? '¡Vencido!' : `¡Faltan ${doc.diasRestantes} días!`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VISTAS RÁPIDAS (INCLUYENDO GANANCIA TOTAL AÑO) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
              <div className={`p-5 rounded-2xl border ${bgCard}`}>
                <p className={`text-xs font-semibold uppercase ${textMuted}`}>Tarifas Hoy</p>
                <p className="text-lg sm:text-xl font-bold">${producidoHoy.toLocaleString()}</p>
              </div>
              <div className={`p-5 rounded-2xl border ${bgCard}`}>
                <p className={`text-xs font-semibold uppercase ${textMuted}`}>Tarifas Mes Actual</p>
                <p className="text-lg sm:text-xl font-bold text-emerald-500">${totalProdMesSel.toLocaleString()}</p>
              </div>
              <div className={`p-5 rounded-2xl border ${bgCard}`}>
                <p className={`text-xs font-semibold uppercase ${textMuted}`}>Ganancia Neta Mes</p>
                <p className="text-lg sm:text-xl font-bold text-blue-400">${gananciaNetaMesSel.toLocaleString()}</p>
              </div>
              <div className="p-5 rounded-2xl border border-gray-800 bg-[#16181D] text-white">
                <p className="text-xs font-semibold uppercase text-gray-300">Ganancia Total Año</p>
                <p className="text-lg sm:text-xl font-bold text-yellow-400">${gananciaTotalAnio.toLocaleString()}</p>
              </div>
              <div className={`p-5 rounded-2xl border col-span-2 sm:col-span-1 ${bgCard}`}>
                <p className={`text-xs font-semibold uppercase ${textMuted}`}>Alertas Docs</p>
                <p className="text-lg sm:text-xl font-bold text-red-500">{alertasCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-xl shadow ${bgCard}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold">Mis Taxis ({vehiculos.length})</h2>
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
                        <div className="flex items-center space-x-2">
                          <span className="bg-yellow-400 text-gray-950 font-extrabold px-2.5 py-1 rounded text-sm tracking-wider">
                            {v.placa}
                          </span>
                          {v.esCompartidoConmigo && (
                            <span className="bg-blue-900/60 text-blue-300 font-extrabold text-[10px] px-2 py-0.5 rounded border border-blue-700">
                              🤝 Compartido contigo
                            </span>
                          )}
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
                            {t.vehiculos?.placa || 'N/A'} - {t.tipo_movimiento === 'producido' ? 'Tarifa' : (t.categoria_gasto || 'Gasto')}
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
            {/* CONTROLES PARA EXPORTAR PDF */}
            <div className={`p-4 rounded-xl shadow border flex flex-col sm:flex-row justify-between items-center gap-3 ${bgCard}`}>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-xs font-bold whitespace-hidden sm:whitespace-nowrap">🚕 Filtrar PDF por Taxi:</span>
                <select
                  value={vehiculoFiltroPDF}
                  onChange={(e) => setVehiculoFiltroPDF(e.target.value)}
                  className={`text-xs font-bold p-2 border rounded-lg outline-none ${selectClass}`}
                >
                  <option value="TODOS">Todos los vehículos (Flota)</option>
                  {vehiculos.map(v => (
                    <option key={v.id} value={v.id}>Placa: {v.placa}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={exportarReportePDF}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition flex items-center justify-center space-x-1.5 shadow"
              >
                <span>📄 Exportar Reporte PDF del Mes</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-5 rounded-xl shadow border-t-4 border-green-500 ${bgCard}`}>
                <h2 className="text-base font-bold mb-3">💵 Registrar Tarifa Diaria</h2>
                <form onSubmit={registrarProducido} className="space-y-3">
                  <select
                    value={vehiculoSeleccionado}
                    onChange={(e) => setVehiculoSeleccionado(e.target.value)}
                    className={selectClass}
                  >
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id} className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>
                        Placa: {v.placa} {v.esCompartidoConmigo ? '(Compartido contigo)' : ''}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition ${esPicoYPlaca ? 'bg-blue-900/40 border-blue-500 text-blue-300' : (darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200')}`}>
                      <input
                        type="checkbox"
                        checked={esPicoYPlaca}
                        onChange={(e) => {
                          setEsPicoYPlaca(e.target.checked)
                          if (e.target.checked) {
                            setEsDomingoFestivo(false)
                            setMonto('0')
                          } else {
                            setMonto('')
                          }
                        }}
                        className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold">🚘 Pico y Placa ($0)</span>
                    </label>

                    <label className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition ${esDomingoFestivo ? 'bg-amber-900/40 border-amber-500 text-amber-300' : (darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200')}`}>
                      <input
                        type="checkbox"
                        checked={esDomingoFestivo}
                        onChange={(e) => {
                          setEsDomingoFestivo(e.target.checked)
                          if (e.target.checked) setEsPicoYPlaca(false)
                        }}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold">🎉 Domingo / Festivo</span>
                    </label>
                  </div>

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
                    placeholder="Obs: Turno día / Noche"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className={inputClass}
                  />

                  <button
                    type="submit"
                    className={`w-full font-bold p-2.5 rounded-lg text-sm transition text-white ${esPicoYPlaca ? 'bg-blue-600 hover:bg-blue-700' : (esDomingoFestivo ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-500 hover:bg-green-600')}`}
                  >
                    Guardar Tarifa
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
                      <option key={v.id} value={v.id} className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>
                        Placa: {v.placa} {v.esCompartidoConmigo ? '(Compartido contigo)' : ''}
                      </option>
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
                    <option value="Otros" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Otros</option>
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

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400">📸 Factura o Recibo (Opcional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setArchivoFactura(e.target.files[0])}
                      className={`w-full p-2 border rounded-lg text-xs outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300'}`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Guardar Mantenimiento
                  </button>
                </form>
              </div>
            </div>

            {/* CALENDARIO DE TARIFAS Y RESUMEN DEL MES SELECCIONADO */}
            <div className={`p-6 rounded-xl shadow border-t-4 border-green-500 ${bgCard}`}>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <h2 className="text-lg font-bold">📅 Calendario y Resumen de Tarifas</h2>
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

              {/* RESUMEN FINANCIERO DEL MES (SIN RECUADRO GRIS DE FONDO) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="text-center">
                  <span className={`text-[10px] font-bold uppercase ${textMuted}`}>Total Tarifas ({nombresMeses[mesActualCal]})</span>
                  <p className="text-lg font-black text-green-500">${totalProdMesSel.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <span className={`text-[10px] font-bold uppercase ${textMuted}`}>Total Mantenimientos</span>
                  <p className="text-lg font-black text-red-500">${totalGastMesSel.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <span className={`text-[10px] font-bold uppercase ${textMuted}`}>Ganancia Neta del Mes</span>
                  <p className="text-lg font-black text-blue-500">${gananciaNetaMesSel.toLocaleString()}</p>
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
                  <span className="w-3 h-3 rounded-full bg-gray-500 inline-block shadow"></span>
                  <span>Sin Trabajar / Sin registro</span>
                </div>
              </div>

              {/* Días de la Semana */}
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

                  let puntoColor = 'bg-gray-500'
                  let estadoBorde = darkMode ? 'border-gray-800 bg-gray-900/40' : 'border-gray-200 bg-white'

                  if (totalDia > 0) {
                    puntoColor = 'bg-green-500 shadow-green-500/50 shadow-md'
                    estadoBorde = darkMode ? 'border-green-800/60 bg-green-950/20' : 'border-green-200 bg-green-50/50'
                  } else if (esDiaPicoYPlaca) {
                    puntoColor = 'bg-blue-500 shadow-blue-500/50 shadow-md'
                    estadoBorde = darkMode ? 'border-blue-800/60 bg-blue-950/30' : 'border-blue-200 bg-blue-50/60'
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

            {/* HISTORIAL DE MANTENIMIENTOS Y REPUESTOS (CON FACTURA) */}
            <div className={`p-6 rounded-xl shadow border-t-4 border-purple-500 ${bgCard}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold">🛠️ Historial de Mantenimientos y Repuestos</h2>
                  <p className={`text-xs mt-0.5 ${textMuted}`}>Total invertido este mes: <span className="font-black text-red-400">${totalGastMesSel.toLocaleString()}</span></p>
                </div>
                <span className="text-xs text-purple-300 font-bold bg-purple-900/50 px-3 py-1.5 rounded-full border border-purple-700 shadow-sm">
                  Inversión Mes: ${totalGastMesSel.toLocaleString()}
                </span>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-purple-50 border-purple-100'}`}>
                <div>
                  <label className="block text-xs font-bold mb-1">🔍 Buscar Nota o Placa</label>
                  <input
                    type="text"
                    placeholder="Ej: pastillas, TEP048..."
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
                    <option value="Otros" className={darkMode ? 'bg-gray-900 text-gray-100' : ''}>Otros</option>
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
                <p className={`text-sm py-4 text-center ${textMuted}`}>No hay mantenimientos registrados.</p>
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
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold">Placa: {item.vehiculos?.placa || 'N/A'}</span>
                                  <span className="px-2 py-0.5 text-xs bg-purple-900/50 text-purple-300 font-bold rounded-md border border-purple-700">
                                    {item.categoria_gasto}
                                  </span>
                                </div>
                                <p className={`italic text-xs ${textMuted}`}>{item.observaciones || 'Sin detalles'}</p>

                                <div className="flex items-center space-x-2 pt-1">
                                  {item.url_factura ? (
                                    <>
                                      <a
                                        href={item.url_factura}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs bg-blue-900/65 hover:bg-blue-800 text-blue-200 px-2.5 py-1 rounded-md font-bold transition flex items-center space-x-1 border border-blue-700 shadow-sm"
                                      >
                                        <span>🖼️ Ver Factura</span>
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => eliminarFotoFactura(item.id, item.url_factura)}
                                        className="text-[11px] text-red-300 hover:text-red-100 underline font-semibold transition"
                                        title="Borrar foto de factura"
                                      >
                                        🗑️ Quitar foto
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setModalFacturaItem(item)}
                                      className="text-xs bg-purple-900/60 hover:bg-purple-800 text-purple-200 px-2.5 py-1 rounded-md font-bold transition flex items-center space-x-1 border border-purple-700 shadow-sm"
                                    >
                                      <span>📸 Agregar Factura</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-red-400">-${Number(item.monto).toLocaleString()}</span>
                                <button
                                  onClick={() => abrirEdicionMantenimiento(item)}
                                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-950 px-2 py-1 rounded text-xs font-bold transition shadow-sm"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => eliminarMantenimiento(item.id)}
                                  className="bg-red-900/50 hover:bg-red-900 text-red-300 px-2 py-1 rounded text-xs font-bold transition border border-red-700 shadow-sm"
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

        {/* 3. PESTAÑA: FLOTA */}
        {tab === 'flota' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-xl shadow border-t-4 border-yellow-400 ${bgCard}`}>
                <h2 className="text-lg font-bold mb-4">➕ Agregar Nuevo Taxi</h2>
                <form onSubmit={agregarVehiculo} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Placa (ej: TEP048)"
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
                <p className={`text-sm ${textMuted}`}>No hay vehículos registrados ni compartidos contigo.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {vehiculos.map((v) => {
                    return (
                      <div key={v.id} className={`p-4 border rounded-xl flex justify-between items-center transition hover:border-yellow-400 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50'}`}>
                        <div className="cursor-pointer space-y-1" onClick={() => setVehiculoDetalle(v)}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="bg-yellow-400 text-gray-950 font-extrabold px-3 py-1 rounded text-sm tracking-wider">
                              {v.placa}
                            </span>
                            {v.esCompartidoConmigo && (
                              <span className="bg-blue-900/70 text-blue-300 font-extrabold text-[10px] px-2 py-0.5 rounded border border-blue-700 shadow-sm">
                                🤝 Compartido contigo
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${textMuted}`}>{v.marca ? `${v.marca} ${v.modelo || ''}` : 'Taxi sin detalles'}</p>
                          <p className="text-[11px] text-yellow-400 font-bold">📊 Toca para ver reporte financiero ➔</p>
                        </div>

                        <div className="flex items-center space-x-1.5">
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
                            onClick={() => abrirEdicionVehiculo(v)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-gray-950 p-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                            title="Editar vehículo"
                          >
                            ✏️
                          </button>

                          <button
                            onClick={() => setVehiculoDetalle(v)}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                            title="Ver detalles y compartir"
                          >
                            👁️
                          </button>

                          <button
                            onClick={() => eliminarVehiculo(v)}
                            className="bg-red-900/50 hover:bg-red-900 text-red-300 p-1.5 rounded-lg text-xs font-bold transition border border-red-700"
                            title={v.esCompartidoConmigo ? 'Quitar de mi lista' : 'Eliminar vehículo'}
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

        {/* MODAL EDITAR CARACTERÍSTICAS DEL VEHÍCULO */}
        {editandoVehiculo && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border space-y-4 ${bgCard}`}>
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-extrabold">✏️ Editar Taxi ({editandoVehiculo.placa})</h3>
                <button
                  onClick={() => setEditandoVehiculo(null)}
                  className="text-gray-400 hover:text-gray-100 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={guardarEdicionVehiculo} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Placa</label>
                  <input
                    type="text"
                    value={editPlaca}
                    onChange={(e) => setEditPlaca(e.target.value)}
                    className={inputClass + ' uppercase'}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">Marca</label>
                    <input
                      type="text"
                      value={editMarca}
                      onChange={(e) => setEditMarca(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Modelo</label>
                    <input
                      type="text"
                      value={editModelo}
                      onChange={(e) => setEditModelo(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditandoVehiculo(null)}
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

        {/* MODAL DETALLE DE VEHÍCULO Y REPORTE FINANCIERO */}
        {vehiculoDetalle && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-lg p-6 rounded-2xl shadow-2xl border space-y-5 max-h-[90vh] overflow-y-auto ${bgCard}`}>
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center space-x-2">
                  <span className="bg-yellow-400 text-gray-950 font-extrabold px-3 py-1 rounded text-base tracking-wider">
                    {vehiculoDetalle.placa}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    vehiculoDetalle.estado === 'Activo' ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'
                  }`}>
                    {vehiculoDetalle.estado || 'Activo'}
                  </span>
                </div>
                <button
                  onClick={() => setVehiculoDetalle(null)}
                  className="text-gray-400 hover:text-gray-100 font-bold text-xl px-2"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 border rounded-xl bg-blue-950/30 border-blue-800 space-y-2">
                <h4 className="text-xs font-extrabold text-blue-300 uppercase tracking-wide">🤝 Compartir este taxi con otro usuario</h4>
                <p className={`text-xs ${textMuted}`}>Ingresa el correo del usuario registrado para darle acceso a ver y gestionar este taxi.</p>
                <form onSubmit={compartirVehiculo} className="flex gap-2 pt-1">
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={correoCompartir}
                    onChange={(e) => setCorreoCompartir(e.target.value)}
                    className={inputClass}
                    required
                  />
                  <button
                    type="submit"
                    disabled={compartiendoState}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs whitespace-nowrap transition"
                  >
                    {compartiendoState ? 'Enviando...' : 'Compartir'}
                  </button>
                </form>
              </div>

              {(() => {
                const prodVehiculo = transacciones
                  .filter(t => t.vehiculo_id === vehiculoDetalle.id && t.tipo_movimiento === 'producido')
                  .reduce((a, c) => a + Number(c.monto), 0)
                const gastVehiculo = transacciones
                  .filter(t => t.vehiculo_id === vehiculoDetalle.id && t.tipo_movimiento === 'gasto')
                  .reduce((a, c) => a + Number(c.monto), 0)
                const netoVehiculo = prodVehiculo - gastVehiculo

                return (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold">📊 Reporte Financiero General</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 bg-green-950/30 border border-green-800 rounded-xl">
                        <p className={`text-[10px] font-semibold uppercase ${textMuted}`}>Producido</p>
                        <p className="text-sm sm:text-base font-black text-green-400">${prodVehiculo.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-red-950/30 border border-red-800 rounded-xl">
                        <p className={`text-[10px] font-semibold uppercase ${textMuted}`}>Gastos</p>
                        <p className="text-sm sm:text-base font-black text-red-400">${gastVehiculo.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-blue-950/30 border border-blue-800 rounded-xl">
                        <p className={`text-[10px] font-semibold uppercase ${textMuted}`}>Ganancia</p>
                        <p className="text-sm sm:text-base font-black text-blue-400">${netoVehiculo.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <button
                onClick={() => setVehiculoDetalle(null)}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold p-2.5 rounded-lg text-sm transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* MODAL DETALLE DE DÍA DEL CALENDARIO */}
        {diaSeleccionadoModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-lg p-6 rounded-2xl shadow-2xl border space-y-4 ${bgCard}`}>
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-base font-black">📅 Tarifas del {diaSeleccionadoModal.fecha}</h3>
                  <p className={`text-xs ${textMuted}`}>Total producido este día: <span className="text-green-400 font-extrabold">${diaSeleccionadoModal.total.toLocaleString()}</span></p>
                </div>
                <button
                  onClick={() => setDiaSeleccionadoModal(null)}
                  className="text-gray-400 hover:text-gray-100 font-bold text-xl px-2"
                >
                  ✕
                </button>
              </div>

              {diaSeleccionadoModal.registros.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <span className="text-3xl">📭</span>
                  <p className={`text-sm ${textMuted}`}>No hay registros de tarifa para este día.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {diaSeleccionadoModal.registros.map(r => (
                    <div key={r.id} className="p-3 border rounded-xl bg-gray-800/40 border-gray-700 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-extrabold text-sm">{r.vehiculos?.placa || 'Taxi'}</span>
                        <p className={`text-xs ${textMuted}`}>{r.observaciones || 'Tarifa normal'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sm text-green-400">+${Number(r.monto).toLocaleString()}</span>
                        <button
                          onClick={() => abrirEdicionProducido(r)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-gray-950 p-1.5 rounded-lg font-bold text-xs"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => eliminarProducido(r.id, r.vehiculos?.placa)}
                          className="bg-red-900/50 hover:bg-red-900 text-red-300 p-1.5 rounded-lg font-bold text-xs border border-red-700"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setDiaSeleccionadoModal(null)}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold p-2.5 rounded-lg text-sm transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* MODAL EDITAR TARIFA */}
        {editandoProducido && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border space-y-4 ${bgCard}`}>
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-extrabold">✏️ Editar Registro de Tarifa</h3>
                <button
                  onClick={() => setEditandoProducido(null)}
                  className="text-gray-400 hover:text-gray-100 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={guardarEdicionProducido} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Vehículo</label>
                  <select
                    value={editProdVehiculoId}
                    onChange={(e) => setEditProdVehiculoId(e.target.value)}
                    className={selectClass}
                  >
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id}>Placa: {v.placa}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition ${editProdEsPicoYPlaca ? 'bg-blue-900/40 border-blue-500 text-blue-300' : 'bg-gray-800 border-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={editProdEsPicoYPlaca}
                      onChange={(e) => {
                        setEditProdEsPicoYPlaca(e.target.checked)
                        if (e.target.checked) {
                          setEditProdEsDomingoFestivo(false)
                          setEditProdMonto('0')
                        }
                      }}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold">Pico y Placa ($0)</span>
                  </label>

                  <label className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition ${editProdEsDomingoFestivo ? 'bg-amber-900/40 border-amber-500 text-amber-300' : 'bg-gray-800 border-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={editProdEsDomingoFestivo}
                      onChange={(e) => {
                        setEditProdEsDomingoFestivo(e.target.checked)
                        if (e.target.checked) setEditProdEsPicoYPlaca(false)
                      }}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold">Domingo / Festivo</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={editProdMonto}
                    disabled={editProdEsPicoYPlaca}
                    onChange={(e) => setEditProdMonto(e.target.value)}
                    className={inputClass}
                    required={!editProdEsPicoYPlaca}
                  />
                  <input
                    type="date"
                    value={editProdFecha}
                    onChange={(e) => setEditProdFecha(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <input
                  type="text"
                  placeholder="Observaciones"
                  value={editProdObs}
                  onChange={(e) => setEditProdObs(e.target.value)}
                  className={inputClass}
                />

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

        {/* MODAL EDITAR MANTENIMIENTO */}
        {editandoGasto && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border space-y-4 ${bgCard}`}>
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-extrabold">✏️ Editar Mantenimiento / Gasto</h3>
                <button
                  onClick={() => setEditandoGasto(null)}
                  className="text-gray-400 hover:text-gray-100 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={guardarEdicionMantenimiento} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Vehículo</label>
                  <select
                    value={editVehiculoId}
                    onChange={(e) => setEditVehiculoId(e.target.value)}
                    className={selectClass}
                  >
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id}>Placa: {v.placa}</option>
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
                    <option value="Cambio de Aceite">Cambio de Aceite</option>
                    <option value="Repuestos / Piezas">Repuestos / Piezas</option>
                    <option value="Taller / Mano de Obra">Taller / Mano de Obra</option>
                    <option value="Llantas / Frenos">Llantas / Frenos</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">Costo ($)</label>
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
                  <label className="block text-xs font-bold mb-1">Observaciones</label>
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
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL AGREGAR / SUBIR FACTURA A GASTO EXISTENTE */}
        {modalFacturaItem && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border space-y-4 ${bgCard}`}>
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-extrabold">📸 Agregar Factura al Mantenimiento</h3>
                <button
                  onClick={() => {
                    setModalFacturaItem(null)
                    setNuevoArchivoFactura(null)
                  }}
                  className="text-gray-400 hover:text-gray-100 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <p className={`text-xs ${textMuted}`}>
                Selecciona la imagen de la factura para asociarla a este gasto de <span className="font-bold text-purple-400">{modalFacturaItem.categoria_gasto}</span> (${Number(modalFacturaItem.monto).toLocaleString()}).
              </p>

              <form onSubmit={guardarFacturaModal} className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNuevoArchivoFactura(e.target.files[0])}
                  className={`w-full p-2.5 border rounded-lg text-xs outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300'}`}
                  required
                />

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalFacturaItem(null)
                      setNuevoArchivoFactura(null)
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={subiendoFacturaModal}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    {subiendoFacturaModal ? 'Subiendo...' : 'Subir y Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. PESTAÑA: DOCUMENTOS */}
        {tab === 'documentos' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-xl shadow border-t-4 border-blue-500 max-w-xl mx-auto ${bgCard}`}>
              <h2 className="text-lg font-bold mb-1">📄 Actualizar / Registrar Vencimiento Documentos</h2>
              
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
                <p className={`text-sm ${textMuted}`}>No hay documentos registrados.</p>
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

        {/* 5. PESTAÑA: PERFIL */}
        {tab === 'perfil' && (
          <div className={`max-w-xl mx-auto p-6 rounded-xl shadow border-t-4 border-gray-900 space-y-6 ${bgCard}`}>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gray-900 text-yellow-400 font-black text-2xl flex items-center justify-center overflow-hidden border-4 border-yellow-400 shadow">
                {usuarioAvatar ? (
                  <img src={usuarioAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(usuarioNombre || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <h2 className="text-xl font-bold">{usuarioNombre}</h2>
              <p className="text-xs font-medium text-yellow-400 mt-1">{perfilCorreo || session?.user?.email}</p>
              {esAdmin && (
                <span className="inline-block mt-2 bg-yellow-400 text-gray-950 font-extrabold text-xs px-3 py-1 rounded-full uppercase shadow">
                  👑 SuperAdmin Activo
                </span>
              )}
            </div>

            <form onSubmit={actualizarPerfil} className={`space-y-4 pt-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <div>
                <label className="block text-xs font-bold mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={perfilNombre}
                  onChange={(e) => setPerfilNombre(e.target.value)}
                  placeholder="Tu Nombre"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Correo Electrónico Registrado</label>
                <input
                  type="email"
                  value={perfilCorreo || session?.user?.email || ''}
                  disabled
                  className={inputClass + ' opacity-60 cursor-not-allowed bg-gray-800/30'}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">URL Foto de Perfil (Opcional)</label>
                <input
                  type="url"
                  value={perfilAvatarUrl}
                  onChange={(e) => setPerfilAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputClass + ' text-xs'}
                />
              </div>

              <button
                type="submit"
                disabled={guardandoPerfil}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-extrabold p-3 rounded-lg text-sm transition shadow"
              >
                {guardandoPerfil ? 'Guardando...' : '💾 Guardar Cambios de Perfil'}
              </button>
            </form>
          </div>
        )}

      </main>
      </div>

      {/* BARRA INFERIOR (CELULAR) */}
      <nav
        className={`md:hidden fixed bottom-0 inset-x-0 z-40 flex gap-1 border-t px-1 pt-2 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {itemsMenu.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 text-xs font-semibold rounded-2xl transition ${
              tab === item.id
                ? (darkMode ? 'bg-yellow-500/20 text-yellow-300' : 'bg-[#FBE9A0] text-gray-900')
                : (darkMode ? 'text-gray-300' : 'text-gray-700')
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {item.icono}
            </svg>
            {item.corto}
          </button>
        ))}
      </nav>
    </div>
  )
}