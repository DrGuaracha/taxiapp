import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modo, setModo] = useState('login') // 'login', 'registro', 'recuperar'

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true)

    if (modo === 'registro') {
      if (!nombre.trim()) {
        alert('Por favor ingresa tu nombre')
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nombre.trim()
          }
        }
      })
      if (error) alert('Error al registrarse: ' + error.message)
      else alert('¡Cuenta creada exitosamente! Ya puedes iniciar sesión.')
    } else if (modo === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert('Error al iniciar sesión: ' + error.message)
    } else if (modo === 'recuperar') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      })
      if (error) alert('Error al enviar correo de recuperación: ' + error.message)
      else alert('Te hemos enviado un enlace a tu correo para restablecer tu contraseña.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border-t-8 border-yellow-400">
        <div className="text-center mb-6">
          <span className="text-4xl">🚕</span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-2">Gestión de Taxis</h1>
          <p className="text-sm text-gray-500">
            {modo === 'registro' && 'Crea tu cuenta de propietario'}
            {modo === 'login' && 'Inicia sesión en tu flota'}
            {modo === 'recuperar' && 'Recupera el acceso a tu cuenta'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {modo === 'registro' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tu Nombre</label>
              <input
                type="text"
                placeholder="Ej: Santiago"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Correo Electrónico</label>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
              required
            />
          </div>

          {modo !== 'recuperar' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase">Contraseña</label>
                {modo === 'login' && (
                  <button
                    type="button"
                    onClick={() => setModo('recuperar')}
                    className="text-xs text-yellow-600 hover:underline font-semibold"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold p-3 rounded-xl transition shadow-md"
          >
            {loading
              ? 'Cargando...'
              : modo === 'registro'
              ? 'Crear Cuenta'
              : modo === 'login'
              ? 'Iniciar Sesión'
              : 'Enviar Enlace de Recuperación'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {modo === 'login' && (
            <button
              onClick={() => setModo('registro')}
              className="text-xs text-gray-600 hover:underline font-semibold block w-full"
            >
              ¿No tienes cuenta? Regístrate aquí
            </button>
          )}

          {modo === 'registro' && (
            <button
              onClick={() => setModo('login')}
              className="text-xs text-gray-600 hover:underline font-semibold block w-full"
            >
              ¿Ya tienes una cuenta? Inicia sesión aquí
            </button>
          )}

          {modo === 'recuperar' && (
            <button
              onClick={() => setModo('login')}
              className="text-xs text-gray-600 hover:underline font-semibold block w-full"
            >
              Volver al Inicio de Sesión
            </button>
          )}
        </div>
      </div>
    </div>
  )
}