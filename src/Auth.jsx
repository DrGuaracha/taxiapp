import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      if (error) alert(error.message)
      else alert('¡Registro exitoso! Revisa tu correo o inicia sesión.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) alert(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 font-sans">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700">
        <div className="text-center mb-6">
          <span className="text-4xl">🚕</span>
          <h1 className="text-2xl font-black text-yellow-400 mt-2">Control de Taxis</h1>
          <p className="text-xs text-gray-400 mt-1">
            {isSignUp ? 'Crea una cuenta para gestionar tu flota' : 'Ingresa tus datos para continuar'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Nombre Completo</label>
              <input
                type="text"
                placeholder="Tu Nombre"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 border rounded-xl bg-gray-900 border-gray-700 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Correo Electrónico</label>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-xl bg-gray-900 border-gray-700 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pr-10 border rounded-xl bg-gray-900 border-gray-700 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                required
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-400 text-sm focus:outline-none"
                title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {mostrarPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-extrabold p-3 rounded-xl text-sm transition shadow-md mt-2"
          >
            {loading ? 'Cargando...' : isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-700 pt-4">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-bold text-yellow-400 hover:underline"
          >
            {isSignUp ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  )
}