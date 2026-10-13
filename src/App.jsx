import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'

export default function App() {
  const [session, setSession] = useState(null)
  const [vehiculos, setVehiculos] = useState([])
  const [transacciones, setTransacciones] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [conductores, setConductores] = useState([])
  
  // Resumen financiero
  const [producidoHoy, setProducidoHoy] = useState(0)
  const [gastosHoy, setGastosHoy] = useState(0)
  const [alertasCount, setAlertasCount] = useState(0)

  // Estados formularios
  const [placa, setPlaca] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')

  const [nombreConductor, setNombreConductor] = useState('')
  const [telefonoConductor, setTelefonoConductor] = useState('')
  const [turnoConductor, setTurnoConductor] = useState('Día')
  const [vehiculoConductorSel, setVehiculoConductorSel] = useState('')

  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState('')
  const [monto, setMonto] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const [vehiculoGastoSeleccionado, setVehiculoGastoSeleccionado] = useState('')
  const [montoGasto, setMontoGasto] = useState('')
  const [categoriaGasto, setCategoriaGasto] = useState('Cambio de Aceite')
  const [obsGasto, setObsGasto] = useState('')

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
      .order('id', { ascending: false })
    setTransacciones(tData || [])

    // 4. Obtener documentos
    const { data: dData } = await supabase
      .from('documentos')
      .select('*, vehiculos(placa)')
      .order('fecha_vencimiento', { ascending: true })
    setDocumentos(dData || [])

    // 5. Calcular Producido y Gastos de hoy
    const hoyStr = new Date().toISOString().split('T')[0]
    
    const totalProducido = (tData || [])
      .filter(t => t.fecha === hoyStr && t.tipo_movimiento === 'producido')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)
    setProducidoHoy(totalProducido)

    const totalGastos = (tData || [])
      .filter(t => t.fecha === hoyStr && t.tipo_movimiento === 'gasto')
      .reduce((acc, curr) => acc + Number(curr.monto), 0)
    setGastosHoy(totalGastos)

    // 6. Calcular alertas de documentos
    const hoy = new Date()
    let alertas = 0
    ;(dData || []).forEach(doc => {
      const fVenc = new Date(doc.fecha_vencimiento)
      const diffDias = Math.ceil((fVenc - hoy) / (1000 * 60 * 60 * 24))
      if (diffDias <= 15) alertas++
    })
    setAlertasCount(alertas)
  }

  // Guardar vehículo
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

  // Guardar Conductor
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

  // Guardar Producido
  async function registrarProducido(e) {
    e.preventDefault()
    if (!vehiculoSeleccionado || !monto) return alert('Selecciona un taxi y el monto')

    const { error } = await supabase.from('transacciones').insert([{
      vehiculo_id: vehiculoSeleccionado,
      tipo_movimiento: 'producido',
      monto: Number(monto),
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

  // Guardar Gasto / Mantenimiento
  async function registrarGasto(e) {
    e.preventDefault()
    if (!vehiculoGastoSeleccionado || !montoGasto) return alert('Selecciona un taxi y el monto')

    const { error } = await supabase.from('transacciones').insert([{
      vehiculo_id: vehiculoGastoSeleccionado,
      tipo_movimiento: 'gasto',
      categoria_gasto: categoriaGasto,
      monto: Number(montoGasto),
      observaciones: obsGasto
    }])

    if (error) alert('Error guardando gasto: ' + error.message)
    else {
      setMontoGasto('')
      setObsGasto('')
      obtenerDatos()
    }
  }

  // Guardar Documento
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

  // Si no hay sesión iniciada, mostramos la pantalla de Login / Registro
  if (!session) {
    return <Auth />
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 font-sans">
      <header className="max-w-5xl mx-auto mb-6 flex justify-between items-center bg-yellow-400 p-4 rounded-xl shadow-md">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🚕 Gestión de Taxis</h1>
          <p className="text-xs text-gray-800">
            Hola, {session.user.user_metadata?.full_name || session.user.email.split('@')[0]}
          </p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs px-3 py-2 rounded-lg transition"
        >
          Cerrar Sesión
        </button>
      </header>

      <main className="max-w-5xl mx-auto space-y-6">
        {/* TARJETAS DE RESUMEN FINANCIERO */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-500">
            <p className="text-gray-500 text-xs font-semibold uppercase">Producido Hoy</p>
            <p className="text-2xl font-bold text-gray-800">${producidoHoy.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-purple-500">
            <p className="text-gray-500 text-xs font-semibold uppercase">Gastos Hoy</p>
            <p className="text-2xl font-bold text-purple-600">${gastosHoy.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500">
            <p className="text-gray-500 text-xs font-semibold uppercase">Ganancia Neta Hoy</p>
            <p className="text-2xl font-bold text-blue-600">${(producidoHoy - gastosHoy).toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-red-500">
            <p className="text-gray-500 text-xs font-semibold uppercase">Alertas Papeles</p>
            <p className="text-2xl font-bold text-red-600">{alertasCount}</p>
          </div>
        </div>

        {/* REGISTRAR PRODUCIDO, GASTO Y DOCUMENTO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Formulario Producido */}
          <div className="bg-white p-5 rounded-xl shadow border-t-4 border-green-500">
            <h2 className="text-base font-bold text-gray-800 mb-3">💵 Producido Diario</h2>
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

              <input
                type="number"
                placeholder="Monto (ej: 120000)"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-400"
                required
              />

              <input
                type="text"
                placeholder="Obs: Turno día"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-400"
              />

              <button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold p-2 rounded-lg text-sm transition"
              >
                Guardar Producido
              </button>
            </form>
          </div>

          {/* Formulario Mantenimiento / Gastos */}
          <div className="bg-white p-5 rounded-xl shadow border-t-4 border-purple-500">
            <h2 className="text-base font-bold text-gray-800 mb-3">🛠️ Mantenimiento / Repuesto</h2>
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

              <input
                type="number"
                placeholder="Costo (ej: 85000)"
                value={montoGasto}
                onChange={(e) => setMontoGasto(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400"
                required
              />

              <input
                type="text"
                placeholder="Obs: Filtro de aceite y lubricante"
                value={obsGasto}
                onChange={(e) => setObsGasto(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400"
              />

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold p-2 rounded-lg text-sm transition"
              >
                Guardar Gasto
              </button>
            </form>
          </div>

          {/* Formulario Documento */}
          <div className="bg-white p-5 rounded-xl shadow border-t-4 border-blue-500">
            <h2 className="text-base font-bold text-gray-800 mb-3">📄 Vencimiento Papeles</h2>
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded-lg text-sm transition"
              >
                Guardar Documento
              </button>
            </form>
          </div>
        </div>

        {/* REGISTRAR CONDUCTOR Y AGREGAR TAXI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Formulario Conductor */}
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
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold p-2 rounded-lg text-sm transition"
              >
                Guardar Conductor
              </button>
            </form>
          </div>

          {/* Formulario Taxi */}
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
                className="w-full bg-yellow-400 hover:bg-yellow-500 font-bold p-2 rounded-lg text-sm transition"
              >
                Guardar Taxi
              </button>
            </form>
          </div>
        </div>

        {/* LISTAS: CONDUCTORES Y MIS TAXIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Conductores Registrados */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-bold text-gray-800 mb-4">👨‍✈️ Conductores Registrados</h2>
            {conductores.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay conductores registrados aún.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
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

          {/* Movimientos Recientes */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-bold text-gray-800 mb-4">📋 Movimientos Recientes</h2>
            {transacciones.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay movimientos registrados.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {transacciones.map((t) => (
                  <div key={t.id} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-bold text-gray-800">
                        {t.vehiculos?.placa || 'N/A'} - {t.tipo_movimiento === 'producido' ? 'Ingreso' : (t.categoria_gasto || 'Gasto')}
                      </span>
                      <p className="text-xs text-gray-500">{t.observaciones || 'Sin detalles'} ({t.fecha})</p>
                    </div>
                    <span className={`font-bold text-base ${t.tipo_movimiento === 'producido' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.tipo_movimiento === 'producido' ? '+' : '-'}${Number(t.monto).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}