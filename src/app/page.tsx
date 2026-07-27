'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

type Producto = { id: number; nombre: string; categoria: string; tiene: boolean; nota?: string; cantidad?: string };
type MenuDia = { id: number; fecha: string; platillo?: string; proteina?: string; verduras?: string; carbohidrato?: string; bebida?: string; preparacion?: string; tips?: string; tiempo_total?: string; mensaje_completo?: string };
type ListaItem = { id: number; nombre: string; categoria: string; cantidad: string; nota: string; comprado: boolean; origen: string; created_at: string };

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
  const [listaMercado, setListaMercado] = useState<ListaItem[]>([]);
  const [menuHoy, setMenuHoy] = useState<MenuDia | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: '', categoria: 'verduras', cantidad: '', nota: '' });
  const [mensaje, setMensaje] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: 0, nombre: '', categoria: 'verduras', cantidad: '', nota: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; nombre: string; categoria: string; cantidad: string; nota: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    supabaseRef.current = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    loadData();
    loadLista();
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

  async function loadLista() {
    try {
      const sb = supabaseRef.current;
      if (!sb) return;
      const r = await sb.from('lista_mercado').select('*').order('comprado', { ascending: true }).order('created_at', { ascending: false });
      if (r.data) setListaMercado(r.data);
    } catch (e) { console.error(e); }
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

  function confirmarEliminar(p: Producto) {
    setDeleteConfirm({ id: p.id, nombre: p.nombre, categoria: p.categoria, cantidad: p.cantidad || '', nota: p.nota || '' });
  }

  async function eliminarDefinitivo() {
    if (!deleteConfirm) return;
    try {
      const sb = supabaseRef.current;
      if (!sb) return;
      await sb.from('productos').delete().eq('id', deleteConfirm.id);
      setDeleteConfirm(null);
      setMensaje(`🗑️ ${deleteConfirm.nombre} eliminado definitivamente`);
      setTimeout(() => setMensaje(''), 3000);
      loadData();
    } catch { setMensaje('❌ Error al eliminar'); }
  }

  async function agregarALista() {
    if (!deleteConfirm) return;
    try {
      const sb = supabaseRef.current;
      if (!sb) return;
      // Agregar a lista de mercado
      await sb.from('lista_mercado').insert({
        nombre: deleteConfirm.nombre,
        categoria: deleteConfirm.categoria,
        cantidad: deleteConfirm.cantidad,
        nota: deleteConfirm.nota,
        comprado: false,
        origen: 'despensa'
      });
      // Eliminar de despensa
      await sb.from('productos').delete().eq('id', deleteConfirm.id);
      setDeleteConfirm(null);
      setMensaje(`🛒 ${deleteConfirm.nombre} movido a la lista de compras`);
      setTimeout(() => setMensaje(''), 3000);
      loadData();
      loadLista();
    } catch { setMensaje('❌ Error al mover a la lista'); }
  }

  async function toggleComprado(item: ListaItem) {
    try {
      const sb = supabaseRef.current;
      if (!sb) return;
      await sb.from('lista_mercado').update({ comprado: !item.comprado }).eq('id', item.id);
      loadLista();
    } catch { /* ignore */ }
  }

  async function eliminarDeLista(id: number, nombre: string) {
    try {
      const sb = supabaseRef.current;
      if (!sb) return;
      await sb.from('lista_mercado').delete().eq('id', id);
      setMensaje(`🗑️ ${nombre} eliminado de la lista`);
      setTimeout(() => setMensaje(''), 3000);
      loadLista();
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

  const grouped = productos.reduce((acc, p) => {
    if (!acc[p.categoria]) acc[p.categoria] = [];
    acc[p.categoria].push(p);
    return acc;
  }, {} as Record<string, Producto[]>);
  const sortedCats = Object.keys(grouped).sort((a, b) => catOrden.indexOf(a) - catOrden.indexOf(b));
  const itemsPendientes = listaMercado.filter(i => !i.comprado).length;

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <div className="max-w-[720px] mx-auto px-4">
        <header className="text-center py-6">
          <h1 className="text-2xl font-bold text-[#2d5a27]">🥘 Despensa del Hogar 🏠</h1>
          <p className="text-sm text-gray-400 mt-1">{productos.length} productos · {itemsPendientes} pendientes 🛒</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-white rounded-xl p-1.5 shadow-sm mb-4">
          {[
            { id: 'despensa', label: `📦 Despensa (${productos.length})` },
            { id: 'lista', label: `🛒 Lista (${itemsPendientes})` },
            { id: 'sugerencia', label: '🍽️ Menú' }
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

        {mensaje && (
          <div className="fixed top-4 right-4 z-50 bg-white shadow-lg rounded-lg px-4 py-3 text-sm border border-gray-200">{mensaje}</div>
        )}

        {/* Botón Agregar + (solo visible en tab despensa) */}
        {activeTab === 'despensa' && (
          <button onClick={() => setShowAddModal(true)}
            className="cursor-pointer w-full py-3 mb-4 bg-[#2d5a27] text-white font-semibold rounded-xl hover:bg-[#1e3d1a] transition-colors border-none flex items-center justify-center gap-2 text-base shadow-sm">
            ➕ Agregar producto
          </button>
        )}

        {/* Tab: Despensa */}
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
                  <button onClick={() => toggleCategoria(cat)}
                    className="cursor-pointer w-full flex items-center gap-2 py-2 text-left hover:bg-gray-50 rounded-lg px-2 transition-colors border-none bg-transparent">
                    <span className="text-xs text-gray-400 w-4 flex-shrink-0">{isCollapsed ? '▶' : '▼'}</span>
                    <h3 className="font-semibold text-gray-600 text-sm flex-1">{categorias[cat] || cat}</h3>
                    <span className="text-xs text-gray-400">({items.length})</span>
                  </button>
                  {!isCollapsed && items.map(p => (
                    <div key={p.id} className="flex justify-between items-center py-2.5 pl-8 border-b border-gray-50">
                      <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
                        <button onClick={() => toggleTiene(p)}
                          className={`cursor-pointer w-3 h-3 rounded-full flex-shrink-0 border-2 transition-colors ${
                            p.tiene ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300 hover:border-gray-400'
                          }`} title={p.tiene ? 'Tiene' : 'No tiene'} />
                        <span className={`${!p.tiene ? 'text-gray-400' : ''}`}>{p.nombre}</span>
                        {p.nota && <span className="text-sm text-gray-400 italic">— {p.nota}</span>}
                        {p.cantidad && <span className="text-sm text-gray-400">({p.cantidad})</span>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => abrirEditar(p)}
                          className="cursor-pointer bg-transparent border-none text-sm px-2 py-1 rounded hover:bg-blue-50" title="Editar">✏️</button>
                        <button onClick={() => confirmarEliminar(p)}
                          className="cursor-pointer bg-transparent border-none text-sm px-2 py-1 rounded hover:bg-red-50" title="Eliminar">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: 🛒 Lista de Compras */}
        {activeTab === 'lista' && (
          <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-100">
              <h2 className="text-lg font-bold text-[#2d5a27]">🛒 Lista de Compras</h2>
              <button onClick={loadLista} className="cursor-pointer bg-gray-100 hover:bg-gray-200 border-none px-3 py-1.5 rounded-lg text-sm">🔄</button>
            </div>
            {listaMercado.length === 0 ? (
              <p className="text-gray-400 italic text-center py-8">🛒 Lista vacía. Los productos que marques como agotados aparecerán aquí.</p>
            ) : (
              listaMercado.map(item => (
                <div key={item.id} className={`flex justify-between items-center py-2.5 border-b border-gray-50 ${item.comprado ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => toggleComprado(item)}
                      className={`cursor-pointer w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        item.comprado ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-gray-400'
                      }`}>
                      {item.comprado && '✓'}
                    </button>
                    <div>
                      <span className={`text-sm ${item.comprado ? 'line-through text-gray-400' : ''}`}>{item.nombre}</span>
                      {item.cantidad && <span className="text-xs text-gray-400 ml-1">({item.cantidad})</span>}
                      {item.nota && <span className="text-xs text-gray-400 italic ml-1">— {item.nota}</span>}
                      <div className="text-xs text-gray-400">{categorias[item.categoria] || item.categoria} {item.origen === 'despensa' && '· de la despensa'}</div>
                    </div>
                  </div>
                  <button onClick={() => eliminarDeLista(item.id, item.nombre)}
                    className="cursor-pointer bg-transparent border-none text-sm px-2 py-1 rounded hover:bg-red-50 flex-shrink-0" title="Eliminar">🗑️</button>
                </div>
              ))
            )}
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

      {/* ➕ Modal Agregar Producto + Sugerencias */}
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-md shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#2d5a27]">➕ Nuevo producto</h3>
              <button onClick={() => setShowAddModal(false)} className="cursor-pointer bg-transparent border-none text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <form onSubmit={(e) => { agregarProducto(e); setShowAddModal(false); }}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">Producto *</label>
                <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none"
                  placeholder="Buscar o escribir producto..." required autoFocus />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">Cantidad</label>
                <input value={form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none" placeholder="Ej: 1 kg" />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">Nota</label>
                <input value={form.nota} onChange={e => setForm({...form, nota: e.target.value})}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none" placeholder="Ej: Marca, preferencia" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">Categoría</label>
                <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 focus:border-green-500 focus:outline-none">
                  {Object.entries(categorias).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <button type="submit" className="cursor-pointer w-full py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors border-none">✅ Agregar a la despensa</button>
            </form>

            {/* Productos sugeridos - desde tu propia despensa */}
            <div className="mt-5 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-500 mb-3">🔄 Tus productos comunes</h4>
              {(() => {
                // Agrupar productos de la despensa por categoria, excluir los que ya tienes activos con tiene=true
                const sugerencias = productos.reduce((acc, p) => {
                  // Solo mostrar productos que no estan activos (tiene=false) o sugerir basado en lo que tienes
                  if (p.tiene) return acc;
                  if (!acc[p.categoria]) acc[p.categoria] = new Set();
                  acc[p.categoria].add(p.nombre);
                  return acc;
                }, {} as Record<string, Set<string>>);
                
                const catLabels: Record<string, string> = {
                  proteinas: '🥩 Proteínas', verduras: '🥦 Verduras', frutas: '🍎 Frutas',
                  granos: '🌾 Granos', lacteos: '🧀 Lácteos', congelados: '❄️ Congelados',
                  snacks: '🍿 Snacks', aceites: '🫒 Aceites', condimentos: '🧂 Condimentos',
                  bebidas: '🥤 Bebidas', cafe: '☕ Café', despensa: '🗄️ Despensa',
                  limpieza: '🧹 Limpieza', cuidado_personal: '🧴 Cuidado Personal', otros: '📦 Otros'
                };
                
                const entries = Object.entries(sugerencias)
                  .filter(([, items]) => items.size > 0)
                  .sort(([a], [b]) => catOrden.indexOf(a) - catOrden.indexOf(b));
                
                if (entries.length === 0) {
                  // Si no hay productos agotados, sugerir algunos de los activos
                  return <p className="text-xs text-gray-400 italic">No hay productos sugeridos. ¡Agrega algo nuevo!</p>;
                }
                
                return entries.map(([cat, items]) => (
                  <div key={cat} className="mb-3">
                    <div className="text-xs text-gray-400 font-medium mb-1.5">{catLabels[cat] || cat}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(items).slice(0, 10).map(item => (
                        <button key={item}
                          onClick={() => setForm(prev => ({...prev, nombre: item, categoria: cat}))}
                          className="cursor-pointer text-xs px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-green-100 hover:text-green-700 transition-colors border-none">
                          + {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ));
              })()}
              <p className="text-xs text-gray-400 mt-2 italic">Productos que has tenido antes y hoy no están en tu despensa</p>
            </div>
          </div>
        </div>
      )}

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

      {/* 🗑️ Modal Eliminar con 3 opciones */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-2">
              <div className="text-4xl mb-2">🗑️</div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">¿"{deleteConfirm.nombre}" se está acabando?</h3>
              <p className="text-sm text-gray-500">¿Qué querés hacer con este producto?</p>
            </div>
            <div className="space-y-2 mt-4">
              <button onClick={agregarALista}
                className="cursor-pointer w-full py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors border-none flex items-center justify-center gap-2">
                🛒 Agregar a la lista de compras
              </button>
              <button onClick={eliminarDefinitivo}
                className="cursor-pointer w-full py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors border-none flex items-center justify-center gap-2">
                ❌ Eliminar definitivamente
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="cursor-pointer w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors border-none">
                ↩️ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
