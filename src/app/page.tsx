'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type Producto = {
  id: number; nombre: string; categoria: string; tiene: boolean; nota?: string; cantidad?: string;
};

type MenuDia = {
  id: number; fecha: string; platillo?: string; proteina?: string; verduras?: string;
  carbohidrato?: string; bebida?: string; preparacion?: string; tips?: string;
  tiempo_total?: string; mensaje_completo?: string;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('despensa');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [menuHoy, setMenuHoy] = useState<MenuDia | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: '', categoria: 'verduras', cantidad: '', nota: '' });
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const hoy = dayjs().format('YYYY-MM-DD');
      const [r1, r2] = await Promise.all([
        supabase.from('productos').select('*').order('categoria', { ascending: true }),
        supabase.from('menu_del_dia').select('*').eq('fecha', hoy).order('created_at', { ascending: false }).limit(1)
      ]);
      if (r1.data) setProductos(r1.data);
      if (r2.data?.length) setMenuHoy(r2.data[0]);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function agregarProducto(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    try {
      await supabase.from('productos').insert({
        nombre: form.nombre.trim(), categoria: form.categoria,
        cantidad: form.cantidad.trim() || null, nota: form.nota.trim() || null,
        tiene: true, creado_por: 'web'
      });
      setMensaje(`✅ ${form.nombre} agregado`);
      setForm({ nombre: '', categoria: 'verduras', cantidad: '', nota: '' });
      setTimeout(() => setMensaje(''), 3000);
      loadData();
    } catch (e) { setMensaje('❌ Error al agregar'); }
  }

  const categorias: Record<string, string> = {
    proteinas: '🥩 Proteínas', verduras: '🥦 Verduras', frutas: '🍎 Frutas',
    granos: '🌾 Granos', lacteos: '🧀 Lácteos', congelados: '❄️ Congelados',
    snacks: '🍿 Snacks', aceites: '🫒 Aceites', condimentos: '🧂 Condimentos',
    bebidas: '🥤 Bebidas', cafe: '☕ Café', despensa: '🗄️ Despensa',
    limpieza: '🧹 Limpieza', cuidado_personal: '🧴 Cuidado Personal', otros: '📦 Otros'
  };
  const catOrden = Object.keys(categorias);

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <div className="max-w-[720px] mx-auto px-4">
        <header className="text-center py-6">
          <h1 className="text-2xl font-bold text-[#2d5a27]">🥘 Despensa del Hogar 🏠</h1>
          <p className="text-sm text-gray-400 mt-1">📡 {productos.length} productos</p>
        </header>

        <div className="flex gap-1.5 bg-white rounded-xl p-1.5 shadow-sm mb-4">
          {[
            { id: 'despensa', label: '📦 Despensa' },
            { id: 'agregar', label: '➕ Agregar' },
            { id: 'sugerencia', label: '🍽️ Sugerencia' }
          ].map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer flex-1 py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-[#2d5a27] text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'despensa' && (
          <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-100">
              <h2 className="text-lg font-bold text-[#2d5a27]">📦 Inventario ({productos.length})</h2>
              <button onClick={loadData} className="cursor-pointer bg-gray-100 hover:bg-gray-200 border-none px-3 py-1.5 rounded-lg text-sm">🔄</button>
            </div>
            {loading ? <p className="text-gray-400 italic">Cargando...</p> : (
              Object.entries(
                productos.reduce((acc, p) => {
                  if (!acc[p.categoria]) acc[p.categoria] = [];
                  acc[p.categoria].push(p);
                  return acc;
                }, {} as Record<string, Producto[]>)
              ).sort(([a], [b]) => catOrden.indexOf(a) - catOrden.indexOf(b) || 0).map(([cat, items]) => (
                <div key={cat} className="mb-2">
                  <h3 className="font-semibold text-gray-600 py-1 text-sm">{categorias[cat] || cat}</h3>
                  {items.map(p => (
                    <div key={p.id} className="flex justify-between items-center py-2.5 border-b border-gray-50">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${p.tiene ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span>{p.nombre}</span>
                        {p.nota && <span className="text-sm text-gray-400 italic">— {p.nota}</span>}
                        {p.cantidad && <span className="text-sm text-gray-400">({p.cantidad})</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'agregar' && (
          <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
            <h2 className="text-lg font-bold text-[#2d5a27] mb-4 pb-3 border-b-2 border-gray-100">➕ Agregar producto</h2>
            <form onSubmit={agregarProducto}>
              {[
                { label: 'Producto *', key: 'nombre', placeholder: 'Ej: Frijoles, Leche...', type: 'text', required: true },
                { label: 'Cantidad', key: 'cantidad', placeholder: 'Ej: 1 kg', type: 'text' },
                { label: 'Nota', key: 'nota', placeholder: 'Ej: Se está acabando', type: 'text' }
              ].map(f => (
                <div key={f.key} className="mb-3">
                  <label className="block text-sm font-medium text-gray-600 mb-1">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none"
                    placeholder={f.placeholder} required={f.required} />
                </div>
              ))}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">Categoría</label>
                <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none">
                  {Object.entries(categorias).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <button type="submit" className="cursor-pointer w-full py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors border-none">✅ Agregar</button>
            </form>
            {mensaje && (
              <div className={`mt-3 p-2.5 rounded-lg text-sm ${mensaje.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {mensaje}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sugerencia' && (
          <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
            <h2 className="text-lg font-bold text-[#2d5a27] mb-4">🍽️ Sugerencia del Día</h2>
            {loading ? <p className="text-gray-400 italic">Cargando...</p> : menuHoy?.mensaje_completo ? (
              <div className="bg-[#fff8e1] rounded-lg p-4 border-l-4 border-orange-500">
                <span className="inline-block bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold mb-3">🍽️ Menú del Día</span>
                <div className="text-sm leading-relaxed whitespace-pre-wrap bg-white/70 p-3 rounded-lg">{menuHoy.mensaje_completo}</div>
                <p className="mt-2 text-xs text-gray-400">📅 {menuHoy.fecha}</p>
              </div>
            ) : (
              <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                <span className="inline-block bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold mb-2">📋 Sugerencia</span>
                <p className="text-sm text-gray-600">Hoy no hay menú guardado aún. El cron de las 8am lo registrará automáticamente.</p>
                <p className="text-xs text-gray-400 mt-2">💬 Avísale a Poncho 🤖</p>
              </div>
            )}
          </div>
        )}

        <footer className="text-center py-5 text-gray-400 text-xs">
          <p>Actualizado por Poncho 🤖 · <a href="https://github.com/CarDlo/despensa" className="text-gray-500 hover:underline" target="_blank">Ver en GitHub</a></p>
        </footer>
      </div>
    </div>
  );
}
