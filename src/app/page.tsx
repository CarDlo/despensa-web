'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

type Producto = { id: number; nombre: string; categoria: string; tiene: boolean; nota?: string; cantidad?: string };
type MenuDia = { id: number; fecha: string; platillo?: string; proteina?: string; verduras?: string; carbohidrato?: string; bebida?: string; preparacion?: string; tips?: string; tiempo_total?: string; mensaje_completo?: string };

const categorias: Record<string, string> = {
  proteinas: '🥩 Proteínas', verduras: '🥦 Verduras', frutas: '🍎 Frutas',
  granos: '🌾 Granos', lacteos: '🧀 Lácteos', congelados: '❄️ Congelados',
  snacks: '🍿 Snacks', aceites: '🫒 Aceites', condimentos: '🧂 Condimentos',
  bebidas: '🥤 Bebidas', cafe: '☕ Café', despensa: '🗄️ Despensa',
  limpieza: '🧹 Limpieza', cuidado_personal: '🧴 Cuidado Personal', otros: '📦 Otros'
};
const catOrden = Object.keys(categorias);

export default function Home() {
  const [activeTab, setActiveTab] = useState('despensa');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [menuHoy, setMenuHoy] = useState<MenuDia | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: '', categoria: 'verduras', cantidad: '', nota: '' });
  const [mensaje, setMensaje] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: 0, nombre: '', categoria: 'verduras', cantidad: '', nota: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; nombre: string } | null>(null);
  // Collapsible categories: true = colapsado, false/undefined = expandido
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    supabaseRef.current = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const sb = supabaseRef.current;
      if (!sb) return;
      const hoy = dayjs().format('YYYY-MM-DD');
      const [r1, r2] = await Promise.all([
        sb.from('productos').select('*').order('categoria', { ascending: true }),
        sb.from('menu_del_dia').select('*').eq('fecha', hoy).order('created_at', { ascending: false }).limit(1)
      ]);
      if (r1.data) setProductos(r1.data);
      if (r2.data?.length) setMenuHoy(r2.data[0]);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function toggleCategoria(cat: string) {
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));
  }

  async function agregarProducto(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    try {
      const sb = supabaseRef.current;
      if (!sb) return;
      await sb.from('productos').insert({
        nombre: form.nombre.trim(), categoria: form.categoria,
        cantidad: form.cantidad.trim() || null, nota: form.nota.trim() || null,
        tiene: true, creado_por: 'web'
      });
      setMensaje(`✅ ${form.nombre} agregado`);
      setForm({ nombre: '', categoria: 'verduras', cantidad: '', nota: '' });
      setTimeout(() => setMensaje(''), 3000);
      loadData();
    } catch { setMensaje('❌ Error al agregar'); }
  }

  function abrirEditar(p: Producto) {
    setEditForm({ id: p.id, nombre: p.nombre, categoria: p.categoria, cantidad: p.cantidad || '', nota: p.nota || '' });
    setEditModal(true);
  }

  async function guardarEdicion() {
    if (!editForm.nombre.trim()) return;
    try {
      const sb = supabaseRef.current;
      if (!sb) return;
      await sb.from('productos').update({
        nombre: editForm.nombre.trim(), categoria: editForm.categoria,
        cantidad: editForm.cantidad.trim() || null, nota: editForm.nota.trim() || null
      }).eq('id', editForm.id);
      setEditModal(false);
      setMensaje(`✅ ${editForm.nombre} actualizado`);
      setTimeout(() => setMensaje(''), 3000);
      loadData();
    } catch { setMensaje('❌ Error al editar'); }
  }

  async function eliminarProducto() {
    if (!deleteConfirm) return;
    try {
      const sb = supabaseRef.current;
      if (!sb) return;
      await sb.from('productos').delete().eq('id', deleteConfirm.id);
      setDeleteConfirm(null);
      setMensaje(`🗑️ ${deleteConfirm.nombre} eliminado`);
      setTimeout(() => setMensaje(''), 3000);
      loadData();
    } catch { setMensaje('❌ Error al eliminar'); }
  }

  async function toggleTiene(p: Producto) {
    try {
      const sb = supabaseRef.current;
      if (!sb) return;
      await sb.from('productos').update({ tiene: !p.tiene }).eq('id', p.id);
      loadData();
    } catch { /* ignore */ }
  }

  // Group products by category
  const grouped = productos.reduce((acc, p) => {
    if (!acc[p.categoria]) acc[p.categoria] = [];
    acc[p.categoria].push(p);
    return acc;
  }, {} as Record<string, Producto[]>);
  const sortedCats = Object.keys(grouped).sort((a, b) => catOrden.indexOf(a) - catOrden.indexOf(b));

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <div className="max-w-[720px] mx-auto px-4">
        <header className="text-center py-6">
          <h1 className="text-2xl font-bold text-[#2d5a27]">🥘 Despensa del Hogar 🏠</h1>
          <p className="text-sm text-gray-400 mt-1">📡 {productos.length} productos</p>
        </header>

        {/* Tabs */}
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

        {/* Mensaje flotante */}
        {mensaje && (
          <div className="fixed top-4 right-4 z-50 bg-white shadow-lg rounded-lg px-4 py-3 text-sm border border-gray-200">
            {mensaje}
          </div>
        )}

        {/* Tab: Despensa - Categorías desplegables */}
        {activeTab === 'despensa' && (
          <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-100">
              <h2 className="text-lg font-bold text-[#2d5a27]">📦 Inventario ({productos.length})</h2>
              <button onClick={loadData} className="cursor-pointer bg-gray-100 hover:bg-gray-200 border-none px-3 py-1.5 rounded-lg text-sm">🔄</button>
            </div>
            {loading ? <p className="text-gray-400 italic">Cargando...</p> : sortedCats.map(cat => {
              const items = grouped[cat];
              const isCollapsed = collapsed[cat];
              return (
                <div key={cat} className="mb-1">
                  {/* Category header - click to toggle */}
                  <button
                    onClick={() => toggleCategoria(cat)}
                    className="cursor-pointer w-full flex items-center gap-2 py-2 text-left hover:bg-gray-50 rounded-lg px-2 transition-colors border-none bg-transparent"
                  >
                    <span className="text-xs text-gray-400 w-4 flex-shrink-0 transition-transform">
                      {isCollapsed ? '▶' : '▼'}
                    </span>
                    <h3 className="font-semibold text-gray-600 text-sm flex-1">
                      {categorias[cat] || cat}
                    </h3>
                    <span className="text-xs text-gray-400">({items.length})</span>
                  </button>

                  {/* Products (hidden when collapsed) */}
                  {!isCollapsed && items.map(p => (
                    <div key={p.id} className="flex justify-between items-center py-2.5 pl-8 border-b border-gray-50 group">
                      <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
                        <button onClick={() => toggleTiene(p)}
                          className={`cursor-pointer w-3 h-3 rounded-full flex-shrink-0 border-2 transition-colors ${
                            p.tiene ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300 hover:border-gray-400'
                          }`}
                          title={p.tiene ? 'Tiene' : 'No tiene'} />
                        <span className={`${!p.tiene ? 'text-gray-400' : ''}`}>{p.nombre}</span>
                        {p.nota && <span className="text-sm text-gray-400 italic">— {p.nota}</span>}
                        {p.cantidad && <span className="text-sm text-gray-400">({p.cantidad})</span>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => abrirEditar(p)}
                          className="cursor-pointer bg-transparent border-none text-sm px-2 py-1 rounded hover:bg-blue-50 transition-colors" title="Editar">✏️</button>
                        <button onClick={() => setDeleteConfirm({ id: p.id, nombre: p.nombre })}
                          className="cursor-pointer bg-transparent border-none text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors" title="Eliminar">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: Agregar */}
        {activeTab === 'agregar' && (
          <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
            <h2 className="text-lg font-bold text-[#2d5a27] mb-4 pb-3 border-b-2 border-gray-100">➕ Agregar producto</h2>
            <form onSubmit={agregarProducto}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">Producto *</label>
                <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none"
                  placeholder="Ej: Frijoles, Leche..." required />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">Cantidad</label>
                <input value={form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none"
                  placeholder="Ej: 1 kg" />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">Nota</label>
                <input value={form.nota} onChange={e => setForm({...form, nota: e.target.value})}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none"
                  placeholder="Ej: Se está acabando" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">Categoría</label>
                <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none">
                  {Object.entries(categorias).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <button type="submit" className="cursor-pointer w-full py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors border-none">✅ Agregar</button>
            </form>
          </div>
        )}

        {/* Tab: Sugerencia */}
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

      {/* ✏️ Modal Editar */}
      {editModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setEditModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#2d5a27] mb-4">✏️ Editar producto</h3>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">Producto *</label>
              <input value={editForm.nombre} onChange={e => setEditForm({...editForm, nombre: e.target.value})}
                className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none" required />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">Cantidad</label>
              <input value={editForm.cantidad} onChange={e => setEditForm({...editForm, cantidad: e.target.value})}
                className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none" placeholder="Ej: 1 kg" />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">Nota</label>
              <input value={editForm.nota} onChange={e => setEditForm({...editForm, nota: e.target.value})}
                className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none" placeholder="Ej: Se está acabando" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Categoría</label>
              <select value={editForm.categoria} onChange={e => setEditForm({...editForm, categoria: e.target.value})}
                className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none">
                {Object.entries(categorias).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors border-none cursor-pointer">Cancelar</button>
              <button onClick={guardarEdicion}
                className="flex-[2] py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors border-none cursor-pointer">💾 Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ Modal Confirmar Eliminar */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-sm shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">¿Eliminar producto?</h3>
            <p className="text-gray-500 mb-5">¿Eliminar "<strong>{deleteConfirm.nombre}</strong>" de la despensa?</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors border-none cursor-pointer">Cancelar</button>
              <button onClick={eliminarProducto}
                className="flex-[2] py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors border-none cursor-pointer">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
