import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'

export default function App() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('inicio') // 'inicio', 'finanzas', 'flota', 'documentos'

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
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      obtenerDatos()
    }
  }, [session])

  async function obtenerDatos() {
    // 1. Obtener vehículos del usuario
    const { data: vData } = await supabase.from('vehiculos').select('*')
    setVehiculos(vData || [])
    if (vData && vData.length > 0) {
      setVehiculoSeleccionado(vData[0].id)
      setVehiculoGastoSeleccionado(vData[0].id)
      setVehiculoDocSeleccionado(vData[0].id)
      setVehiculoConductorSel(vData[0].id)
    }

    // 2. Obtener conductores
    const { data: cData } = await supabase
      .from('conductores')
      .select('*, vehiculos(placa)')
      .order('id', { ascending: false })
    setConductores(cData || [])

    // 3. Obtener transacciones
    const { data: tData } = await supabase
      .from('transacciones')
      .select('*, vehiculos(placa)')
      .order('fecha', { ascending: false })
    setTransacciones(tData || [])

    // 4. Obtener documentos
    const { data: dData } = await supabase
      .from('documentos')
      .select('*, vehiculos(placa)')
      .order('fecha_vencimiento', { ascending: true })
    setDocumentos(dData || [])

    // 5. Cálculos diarios y mensuales
    const hoyStr = new Date().toISOString().split('T')[0]
    const mesActualStr = hoyStr.substring(0, 7) // 'YYYY-MM'

    // Totales Hoy
    const totalProdHoy = (tData || [])
      .filter(t => t.fecha === hoyStr && t.tipo_movimiento === 'producido')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)
    setProducidoHoy(totalProdHoy)

    const totalGastHoy = (tData || [])
      .filter(t => t.fecha === hoyStr && t.tipo_movimiento === 'gasto')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)
    setGastosHoy(totalGastHoy)

    // Totales Mes
    const totalProdMes = (tData || [])
      .filter(t => t.fecha && t.fecha.startsWith(mesActualStr) && t.tipo_movimiento === 'producido')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)
    setProducidoMes(totalProdMes)

    const totalGastMes = (tData || [])
      .filter(t => t.fecha && t.fecha.startsWith(mesActualStr) && t.tipo_movimiento === 'gasto')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)
    setGastosMes(totalGastMes)

    // 6. Alertas de documentos
    const hoy = new Date()
    let alertas = 0
    ;(dData || []).forEach(doc => {
      const fVenc = new Date(doc.fecha_vencimiento)
      const diffDias = Math.ceil((fVenc - hoy) / (1000 * 60 * 60 * 24))
      if (diffDias <= 15) alertas++
    })
    setAlertasCount(alertas)
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

    const { error } = await supabase.from('documentos').insert([{
      vehiculo_id: vehiculoDocSeleccionado,
      tipo_documento: tipoDocumento,
      fecha_vencimiento: fechaVencimiento
    }])

    if (error) alert('Error: ' + error.message)
    else {
      setFechaVencimiento('')
      obtenerDatos()
    }
  }

  function getEstadoDocumento(fechaStr) {
    const hoy = new Date()
    const fVenc = new Date(fechaStr)
    const diffDias = Math.ceil((fVenc - hoy) / (1000 * 60 * 60 * 24))

    if (diffDias < 0) return { texto: 'Vencido', color: 'bg-red-100 text-red-800 border-red-300' }
    if (diffDias <= 15) return { texto: `Vence en ${diffDias} días`, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
    return { texto: 'Al día', color: 'bg-green-100 text-green-800 border-green-300' }
  }

  // Obtener lista única de meses disponibles en las transacciones para el filtro
  const mesesDisponibles = Array.from(
    new Set(
      transacciones
        .filter(t => t.tipo_movimiento === 'gasto' && t.fecha)
        .map(t => t.fecha.substring(0, 7))
    )
  ).sort().reverse()

  // Agrupar producidos por fecha
  const producidosPorFecha = transacciones
    .filter(t => t.tipo_movimiento === 'producido')
    .reduce((acc, curr) => {
      const f = curr.fecha || 'Sin Fecha'
      if (!acc[f]) acc[f] = []
      acc[f].push(curr)
      return acc
    }, {})

  // Filtrar mantenimientos antes de agrupar por fecha
  const mantenimientosFiltrados = transacciones.filter(t => {
    if (t.tipo_movimiento !== 'gasto') return false

    // Filtro por mes (YYYY-MM)
    if (filtroMantenimientoMes !== 'TODOS' && (!t.fecha || !t.fecha.startsWith(filtroMantenimientoMes))) {
      return false
    }

    // Filtro por categoría
    if (filtroMantenimientoCategoria !== 'TODAS' && t.categoria_gasto !== filtroMantenimientoCategoria) {
      return false
    }

    // Filtro por texto libre (placa o nota/repuesto)
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

  // Agrupar mantenimientos filtrados por fecha
  const mantenimientosPorFecha = mantenimientosFiltrados.reduce((acc, curr) => {
    const f = curr.fecha || 'Sin Fecha'
    if (!acc[f]) acc[f] = []
    acc[f].push(curr)
    return acc
  }, {})

  if (!session) return <Auth />

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-6 font-sans pb-20">
      {/* ENCABEZADO */}
      <header className="max-w-5xl mx-auto mb-4 flex justify-between items-center bg-yellow-400 p-4 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">🚕 Gestión de Taxis</h1>
          <p className="text-xs font-medium text-gray-800">
            Hola, {session.user.user_metadata?.full_name || session.user.email.split('@')[0]}
          </p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs px-3 py-2 rounded-lg transition"
        >
          Salir
        </button>
      </header>

      {/* MENÚ DE NAVEGACIÓN (TABS) */}
      <nav className="max-w-5xl mx-auto mb-6 flex overflow-x-auto bg-white p-1 rounded-xl shadow space-x-1">
        <button
          onClick={() => setTab('inicio')}
          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition whitespace-nowrap ${
            tab === 'inicio' ? 'bg-yellow-400 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          📊 Inicio
        </button>
        <button
          onClick={() => setTab('finanzas')}
          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition whitespace-nowrap ${
            tab === 'finanzas' ? 'bg-yellow-400 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          💵 Movimientos
        </button>
        <button
          onClick={() => setTab('flota')}
          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition whitespace-nowrap ${
            tab === 'flota' ? 'bg-yellow-400 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          🚕 Flota y Personal
        </button>
        <button
          onClick={() => setTab('documentos')}
          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition whitespace-nowrap ${
            tab === 'documentos' ? 'bg-yellow-400 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          📄 Papeles
        </button>
      </nav>

      <main className="max-w-5xl mx-auto space-y-6">

        {/* 1. PESTAÑA: INICIO / DASHBOARD PRINCIPAL */}
        {tab === 'inicio' && (
          <div className="space-y-6">
            {/* RESUMEN HOY Y MES */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-500">
                <p className="text-gray-500 text-xs font-semibold uppercase">Producido Hoy</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800">${producidoHoy.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow border-l-4 border-emerald-600">
                <p className="text-gray-500 text-xs font-semibold uppercase">Producido Mes</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-700">${producidoMes.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500">
                <p className="text-gray-500 text-xs font-semibold uppercase">Ganancia Mes Neta</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">${(producidoMes - gastosMes).toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow border-l-4 border-red-500">
                <p className="text-gray-500 text-xs font-semibold uppercase">Alertas Papeles</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{alertasCount}</p>
              </div>
            </div>

            {/* RESUMEN RÁPIDO DE LA FLOTA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold text-gray-800">🚕 Mis Taxis ({vehiculos.length})</h2>
                  <button onClick={() => setTab('flota')} className="text-xs text-yellow-600 font-bold hover:underline">
                    + Gestionar
                  </button>
                </div>
                {vehiculos.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay taxis registrados. Ve a "Flota" para agregar uno.</p>
                ) : (
                  <div className="space-y-3">
                    {vehiculos.map((v) => (
                      <div key={v.id} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center">
                        <div>
                          <span className="bg-yellow-300 text-gray-900 font-extrabold px-2.5 py-1 rounded text-sm tracking-wider">
                            {v.placa}
                          </span>
                          <p className="text-xs text-gray-600 mt-1">{v.marca ? `${v.marca} ${v.modelo || ''}` : 'Taxi activo'}</p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-semibold">
                          {v.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ÚLTIMOS MOVIMIENTOS */}
              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold text-gray-800">📋 Movimientos Recientes</h2>
                  <button onClick={() => setTab('finanzas')} className="text-xs text-yellow-600 font-bold hover:underline">
                    + Registrar
                  </button>
                </div>
                {transacciones.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay movimientos aún.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {transacciones.slice(0, 5).map((t) => (
                      <div key={t.id} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center text-sm">
                        <div>
                          <span className="font-bold text-gray-800">
                            {t.vehiculos?.placa || 'N/A'} - {t.tipo_movimiento === 'producido' ? 'Ingreso' : (t.categoria_gasto || 'Gasto')}
                          </span>
                          <p className="text-xs text-gray-500">{t.observaciones || 'Sin detalles'} ({t.fecha})</p>
                        </div>
                        <span className={`font-bold text-sm ${t.tipo_movimiento === 'producido' ? 'text-green-600' : 'text-red-600'}`}>
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
              {/* Formulario Producido con Fecha */}
              <div className="bg-white p-5 rounded-xl shadow border-t-4 border-green-500">
                <h2 className="text-base font-bold text-gray-800 mb-3">💵 Registrar Producido Diario</h2>
                <form onSubmit={registrarProducido} className="space-y-3">
                  <select
                    value={vehiculoSeleccionado}
                    onChange={(e) => setVehiculoSeleccionado(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-green-400"
                  >
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id}>Placa: {v.placa}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Monto (ej: 120000)"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      className="p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-400"
                      required
                    />
                    <input
                      type="date"
                      value={fechaProducido}
                      onChange={(e) => setFechaProducido(e.target.value)}
                      className="p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-400"
                      required
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Obs: Turno día / Noche"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-400"
                  />

                  <button
                    type="submit"
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Guardar Producido
                  </button>
                </form>
              </div>

              {/* Formulario Mantenimiento con Fecha */}
              <div className="bg-white p-5 rounded-xl shadow border-t-4 border-purple-500">
                <h2 className="text-base font-bold text-gray-800 mb-3">🛠️ Registrar Mantenimiento / Gasto</h2>
                <form onSubmit={registrarGasto} className="space-y-3">
                  <select
                    value={vehiculoGastoSeleccionado}
                    onChange={(e) => setVehiculoGastoSeleccionado(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id}>Placa: {v.placa}</option>
                    ))}
                  </select>

                  <select
                    value={categoriaGasto}
                    onChange={(e) => setCategoriaGasto(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="Cambio de Aceite">Cambio de Aceite</option>
                    <option value="Repuestos / Piezas">Repuestos / Piezas</option>
                    <option value="Taller / Mano de Obra">Taller / Mano de Obra</option>
                    <option value="Llantas / Frenos">Llantas / Frenos</option>
                    <option value="Lavado / Otros">Lavado / Otros</option>
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Costo (ej: 85000)"
                      value={montoGasto}
                      onChange={(e) => setMontoGasto(e.target.value)}
                      className="p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400"
                      required
                    />
                    <input
                      type="date"
                      value={fechaGasto}
                      onChange={(e) => setFechaGasto(e.target.value)}
                      className="p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400"
                      required
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Obs: Filtro de aceite y lubricante"
                    value={obsGasto}
                    onChange={(e) => setObsGasto(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400"
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

            {/* SECCIÓN 1: CONTEO DE PRODUCIDOS DÍA A DÍA */}
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-lg font-bold text-gray-800 mb-4">📅 Conteo de Producidos Día a Día</h2>
              {Object.keys(producidosPorFecha).length === 0 ? (
                <p className="text-gray-500 text-sm">No hay producidos registrados aún.</p>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {Object.entries(producidosPorFecha).map(([fecha, lista]) => {
                    const totalDia = lista.reduce((a, c) => a + Number(c.monto), 0)
                    return (
                      <div key={fecha} className="border rounded-xl p-4 bg-gray-50">
                        <div className="flex justify-between items-center border-b pb-2 mb-3">
                          <span className="font-extrabold text-gray-800 text-sm">📆 Fecha: {fecha}</span>
                          <span className="bg-green-100 text-green-800 font-black text-sm px-3 py-1 rounded-full border border-green-300">
                            Total Producido: ${totalDia.toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {lista.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-xs sm:text-sm bg-white p-2.5 rounded border">
                              <span className="font-bold text-gray-700">Placa: {item.vehiculos?.placa || 'N/A'}</span>
                              <span className="text-gray-500">{item.observaciones || 'Sin notas'}</span>
                              <span className="font-bold text-green-600">+${Number(item.monto).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* SECCIÓN 2: HISTORIAL DE MANTENIMIENTOS CON BUSCADOR, CATEGORÍA Y MES */}
            <div className="bg-white p-6 rounded-xl shadow border-t-4 border-purple-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-gray-800">🛠️ Historial de Mantenimientos y Repuestos</h2>
                <span className="text-xs text-purple-700 font-bold bg-purple-100 px-2.5 py-1 rounded-full">
                  {mantenimientosFiltrados.length} registro(s) encontrado(s)
                </span>
              </div>

              {/* BARRA DE FILTROS TRES COLUMNAS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 bg-purple-50 p-3 rounded-xl border border-purple-100">
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">🔍 Buscar Nota o Placa</label>
                  <input
                    type="text"
                    placeholder="Ej: pastillas, WPO841..."
                    value={filtroMantenimientoTexto}
                    onChange={(e) => setFiltroMantenimientoTexto(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white text-xs outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">🏷️ Categoría</label>
                  <select
                    value={filtroMantenimientoCategoria}
                    onChange={(e) => setFiltroMantenimientoCategoria(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white text-xs outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="TODAS">Todas las categorías</option>
                    <option value="Cambio de Aceite">Cambio de Aceite</option>
                    <option value="Repuestos / Piezas">Repuestos / Piezas</option>
                    <option value="Taller / Mano de Obra">Taller / Mano de Obra</option>
                    <option value="Llantas / Frenos">Llantas / Frenos</option>
                    <option value="Lavado / Otros">Lavado / Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">📅 Mes / Período</label>
                  <select
                    value={filtroMantenimientoMes}
                    onChange={(e) => setFiltroMantenimientoMes(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white text-xs outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="TODOS">Todos los meses</option>
                    {mesesDisponibles.map((m) => (
                      <option key={m} value={m}>Mes: {m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* RESULTADOS DE MANTENIMIENTOS */}
              {Object.keys(mantenimientosPorFecha).length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">
                  {filtroMantenimientoTexto || filtroMantenimientoCategoria !== 'TODAS' || filtroMantenimientoMes !== 'TODOS'
                    ? 'No se encontraron mantenimientos con los filtros aplicados.'
                    : 'No hay mantenimientos o repuestos registrados aún.'}
                </p>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {Object.entries(mantenimientosPorFecha).map(([fecha, lista]) => {
                    const totalGastoDia = lista.reduce((a, c) => a + Number(c.monto), 0)
                    return (
                      <div key={fecha} className="border rounded-xl p-4 bg-purple-50/40">
                        <div className="flex justify-between items-center border-b border-purple-200 pb-2 mb-3">
                          <span className="font-extrabold text-purple-900 text-sm">📆 Fecha Mantenimiento: {fecha}</span>
                          <span className="bg-purple-100 text-purple-900 font-black text-xs sm:text-sm px-3 py-1 rounded-full border border-purple-300">
                            Subtotal: ${totalGastoDia.toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {lista.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-xs sm:text-sm bg-white p-2.5 rounded border border-purple-100">
                              <div>
                                <span className="font-bold text-gray-800">Placa: {item.vehiculos?.placa || 'N/A'}</span>
                                <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 font-bold rounded-md">
                                  {item.categoria_gasto || 'Mantenimiento'}
                                </span>
                              </div>
                              <span className="text-gray-600 italic text-xs">{item.observaciones || 'Sin detalles'}</span>
                              <span className="font-bold text-red-600">-${Number(item.monto).toLocaleString()}</span>
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
              <div className="bg-white p-6 rounded-xl shadow border-t-4 border-yellow-400">
                <h2 className="text-lg font-bold text-gray-800 mb-4">➕ Agregar Nuevo Taxi</h2>
                <form onSubmit={agregarVehiculo} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Placa (ej: WPO841)"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value)}
                    className="w-full p-2 border rounded-lg uppercase text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Marca (ej: Kia)"
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      className="p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <input
                      type="text"
                      placeholder="Modelo (ej: 2018)"
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      className="p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-yellow-400 hover:bg-yellow-500 font-bold p-2.5 rounded-lg text-sm transition"
                  >
                    Guardar Taxi
                  </button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-xl shadow border-t-4 border-orange-400">
                <h2 className="text-lg font-bold text-gray-800 mb-4">👤 Registrar Conductor</h2>
                <form onSubmit={agregarConductor} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre Completo"
                      value={nombreConductor}
                      onChange={(e) => setNombreConductor(e.target.value)}
                      className="p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Teléfono / Célular"
                      value={telefonoConductor}
                      onChange={(e) => setTelefonoConductor(e.target.value)}
                      className="p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={turnoConductor}
                      onChange={(e) => setTurnoConductor(e.target.value)}
                      className="p-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="Día">Turno Día</option>
                      <option value="Noche">Turno Noche</option>
                      <option value="24 Horas">24 Horas</option>
                    </select>

                    <select
                      value={vehiculoConductorSel}
                      onChange={(e) => setVehiculoConductorSel(e.target.value)}
                      className="p-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="">Sin taxi asignado</option>
                      {vehiculos.map((v) => (
                        <option key={v.id} value={v.id}>Asignar a Placa: {v.placa}</option>
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

            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-lg font-bold text-gray-800 mb-4">👨‍✈️ Conductores Registrados</h2>
              {conductores.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay conductores registrados aún.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {conductores.map((c) => (
                    <div key={c.id} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center text-sm">
                      <div>
                        <span className="font-bold text-gray-800">{c.nombre}</span>
                        <p className="text-xs text-gray-500">
                          {c.telefono ? `Tel: ${c.telefono}` : 'Sin teléfono'} | Turno: {c.turno}
                        </p>
                      </div>
                      <span className="bg-orange-100 text-orange-800 text-xs px-2.5 py-1 rounded-full font-bold">
                        {c.vehiculos?.placa ? `Placa: ${c.vehiculos.placa}` : 'Sin Taxi'}
                      </span>
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
            <div className="bg-white p-6 rounded-xl shadow border-t-4 border-blue-500 max-w-xl mx-auto">
              <h2 className="text-lg font-bold text-gray-800 mb-4">📄 Registrar Vencimiento Papeles</h2>
              <form onSubmit={registrarDocumento} className="space-y-3">
                <select
                  value={vehiculoDocSeleccionado}
                  onChange={(e) => setVehiculoDocSeleccionado(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>Placa: {v.placa}</option>
                  ))}
                </select>

                <select
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="SOAT">SOAT</option>
                  <option value="Tecnomecánica">Tecnomecánica</option>
                  <option value="Póliza Contractual">Póliza Contractual</option>
                  <option value="Tarjeta de Operación">Tarjeta de Operación</option>
                </select>

                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg text-sm transition"
                >
                  Guardar Documento
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-lg font-bold text-gray-800 mb-4">📄 Estado de Documentos Registrados</h2>
              {documentos.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay documentos registrados aún.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documentos.map((d) => {
                    const estado = getEstadoDocumento(d.fecha_vencimiento)
                    return (
                      <div key={d.id} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center text-sm">
                        <div>
                          <span className="font-bold text-gray-800">
                            {d.vehiculos?.placa || 'N/A'} - {d.tipo_documento}
                          </span>
                          <p className="text-xs text-gray-500">Vence: {d.fecha_vencimiento}</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${estado.color}`}>
                          {estado.texto}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}