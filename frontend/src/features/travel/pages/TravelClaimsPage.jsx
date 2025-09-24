import React, { useEffect, useMemo, useState } from 'react';
import { getTravelClaims, getTravelClaim, createTravelClaim, updateTravelClaim, /*uploadClaimReceipts,*/ updateClaimItem, deleteClaimItem, uploadClaimItemReceipts, deleteClaimItemReceipt } from '../../../services/travelService';
import { useAuthStore } from '../../auth/authStore';

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Header = ({ title, actions }) => (
  <div className="flex items-center justify-between p-4 border-b border-slate-200">
    <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
    <div className="flex gap-2">{actions}</div>
  </div>
);

const Input = (props) => (
  <input {...props} className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${props.className||''}`} />
);

export default function TravelClaimsPage() {
  const can = useAuthStore(s => s.can);
  const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ notes: '', items: [] });
  const [item, setItem] = useState({ date: '', category: 'TA', description: '', amount: '' });

  // detail state
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTravelClaims();
      setList(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addItem = () => {
    if (!item.date || !item.category || !item.amount) return;
    setForm(prev => ({ ...prev, items: [...prev.items, { ...item, attachments: [] }] }));
    setItem({ date: '', category: 'TA', description: '', amount: '' });
  };

  const addDraftAttachments = (idx, files) => {
    const arr = Array.from(files || []);
    setForm(prev => ({
      ...prev,
      items: prev.items.map((it, i) => i === idx ? { ...it, attachments: [...(it.attachments||[]), ...arr] } : it)
    }));
  };

  const removeDraftAttachment = (idx, fIdx) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((it, i) => i === idx ? { ...it, attachments: (it.attachments||[]).filter((_, j) => j !== fIdx) } : it)
    }));
  };

  const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const onCreate = async () => {
    const payload = { notes: form.notes, items: form.items.map(i => ({ date: i.date, category: i.category, description: i.description, amount: parseFloat(i.amount || 0) })) };
    const created = await createTravelClaim(payload);
    // Upload draft attachments mapped by item order
    const uploads = [];
    form.items.forEach((it, idx) => {
      if (it.attachments && it.attachments.length && created?.items?.[idx]?.id) {
        uploads.push(uploadClaimItemReceipts(created.id, created.items[idx].id, it.attachments));
      }
    });
    if (uploads.length) await Promise.all(uploads);
    setForm({ notes: '', items: [] });
    await load();
  };

  const openDetail = async (c) => {
    setOpen(true);
    setSelected(null);
    const full = await getTravelClaim(c.id);
    setSelected(full);
  };

  const onUpload = async (files) => {
    if (!selected || !files?.length) return;
    await uploadClaimReceipts(selected.id, files);
    const refreshed = await getTravelClaim(selected.id);
    setSelected(refreshed);
  };

  const onUpdateAmount = async (itemId, amount) => {
    if (!selected) return;
    const updated = await updateClaimItem(selected.id, itemId, { amount: parseFloat(amount||0) });
    setSelected(updated);
  };

  const onDeleteItem = async (itemId) => {
    if (!selected) return;
    const updated = await deleteClaimItem(selected.id, itemId);
    setSelected(updated);
  };

  const sum = (items) => (items||[]).reduce((s,i)=>s + Number(i.amount||0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Travel Claims</h1>
      </div>

      {can('travel.claim.create') && (
        <Card>
          <Header title="New Claim" />
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm text-slate-600">Notes</label>
              <Input name="notes" value={form.notes} onChange={onChange} placeholder="Notes" />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-sm text-slate-600">Date</label>
                  <Input type="date" value={item.date} onChange={e=>setItem(prev=>({...prev,date:e.target.value}))} />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-slate-600">Category</label>
                  <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" value={item.category} onChange={e=>setItem(prev=>({...prev,category:e.target.value}))}>
                    <option value="TA">Travel Allowance</option>
                    <option value="DA">Daily Allowance</option>
                    <option value="Lodging">Lodging</option>
                    <option value="Misc">Misc</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm text-slate-600">Amount</label>
                  <Input value={item.amount} onChange={e=>setItem(prev=>({...prev,amount:e.target.value}))} placeholder="0" />
                </div>
                <button onClick={addItem} className="px-3 py-2 bg-slate-700 text-white rounded-lg">Add</button>
              </div>
              <div className="mt-3">
                {form.items.length === 0 && <div className="text-slate-500 text-sm">No items yet</div>}
                {form.items.length > 0 && (
                  <div className="rounded-lg border border-slate-200 divide-y">
                    {form.items.map((i, idx) => (
                      <div key={idx} className="p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-slate-800">{i.category} · {i.amount}</div>
                            <div className="text-slate-500">{i.date} · {i.description || '—'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="px-2 py-1 rounded bg-slate-100 border cursor-pointer text-xs">Upload Receipts
                              <input type="file" multiple className="hidden" onChange={(e)=>{ if(e.target.files?.length){ addDraftAttachments(idx, e.target.files); e.target.value=''; } }} />
                            </label>
                            <button className="text-red-600 hover:underline" onClick={()=>setForm(prev=>({...prev,items: prev.items.filter((_,j)=>j!==idx)}))}>Remove</button>
                          </div>
                        </div>
                        {(i.attachments && i.attachments.length > 0) && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {i.attachments.map((f, fIdx) => {
                              const url = URL.createObjectURL(f);
                              const isImg = f.type?.startsWith('image/');
                              return (
                                <div key={fIdx} className="relative">
                                  {isImg ? (
                                    <a href={url} target="_blank" rel="noreferrer">
                                      <img alt="draft" className="h-14 w-14 object-cover rounded border" src={url} />
                                    </a>
                                  ) : (
                                    <a className="inline-flex items-center px-2 py-1 text-xs border rounded bg-white text-sky-700 hover:underline" href={url} target="_blank" rel="noreferrer">View {f.name}</a>
                                  )}
                                  <button title="Remove" onClick={()=>removeDraftAttachment(idx, fIdx)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-5 w-5 text-xs">×</button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="p-2 text-right text-sm font-medium">Total: {sum(form.items)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-slate-200 flex justify-end">
            <button onClick={onCreate} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg">Create</button>
          </div>
        </Card>
      )}

      <Card>
        <Header title="All Claims" />
        <div className="divide-y">
          {loading && <div className="p-4 text-slate-500">Loading...</div>}
          {!loading && list.length === 0 && <div className="p-6 text-slate-500">No claims found</div>}
          {list.map(r => (
            <div key={r.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium text-slate-800">Claim #{r.id}</div>
                <div className="text-slate-500">Items: {r.items?.length || 0} · Total Claimed: {r.total_claimed}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs ${r.status==='PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700' : r.status==='APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{r.status}</span>
                <button onClick={() => openDetail(r)} className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 border">View</button>
                {/* Removed submit button since approvals/workflow removed */}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Detail modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50" onClick={()=>setOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-semibold text-slate-800">Claim Details</div>
              <button onClick={()=>setOpen(false)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="p-4 space-y-4">
              {!selected && <div className="text-slate-500">Loading...</div>}
              {selected && (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500">Claim ID</div>
                      <div className="font-medium text-slate-800">#{selected.id}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Status</div>
                      <div className="font-medium text-slate-800">{selected.status}</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-slate-800">Items</div>
                      {/* Removed general Upload Receipts in modal header */}
                    </div>
                    <div className="mt-2 rounded-lg border border-slate-200 divide-y">
                      {(selected.items||[]).length === 0 && <div className="p-3 text-sm text-slate-500">No items</div>}
                      {(selected.items||[]).map((it, idx) => (
                        <div key={it.id} className="p-3 grid grid-cols-12 gap-3 items-center text-sm">
                          <div className="col-span-3">
                            <div className="text-slate-500">Date</div>
                            <div className="font-medium text-slate-800">{String(it.date).slice(0,10)}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-slate-500">Category</div>
                            <div className="font-medium text-slate-800">{it.category}</div>
                          </div>
                          <div className="col-span-3">
                            <div className="text-slate-500">Receipt</div>
                            {(it.url || it.receipt_path) ? (
                              (it.mime_type && it.mime_type.startsWith('image/')) ? (
                                <a href={`${(it.url) ? it.url : `${apiOrigin}/${String(it.receipt_path).replace(/^\//,'')}`}`} target="_blank" rel="noreferrer">
                                  <img alt="receipt" className="h-14 w-14 object-cover rounded border" src={`${(it.url) ? it.url : `${apiOrigin}/${String(it.receipt_path).replace(/^\//,'')}`}`} />
                                </a>
                              ) : (
                                <a className="text-sky-700 hover:underline" href={`${(it.url) ? it.url : `${apiOrigin}/${String(it.receipt_path).replace(/^\//,'')}`}`} target="_blank" rel="noreferrer">View</a>
                              )
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </div>
                          <div className="col-span-2">
                            <div className="text-slate-500">Amount</div>
                            {can('travel.claim.update') ? (
                              <input className="w-full rounded border px-2 py-1" defaultValue={it.amount} onBlur={e=>onUpdateAmount(it.id, e.target.value)} />
                            ) : (
                              <div className="font-medium text-slate-800">{it.amount}</div>
                            )}
                          </div>
                          <div className="col-span-2 text-right">
                            {can('travel.claim.update') && (
                              <button className="text-red-600 hover:underline" onClick={()=>onDeleteItem(it.id)}>Delete</button>
                            )}
                          </div>
                          <div className="col-span-3">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-slate-800">Receipts</div>
                              {can('travel.claim.update') && (
                                <label className="px-2 py-1 rounded bg-emerald-600 text-white cursor-pointer text-xs">Add Receipts
                                  <input type="file" multiple className="hidden" onChange={async (e)=>{ if(e.target.files?.length){ const claim = await uploadClaimItemReceipts(selected.id, it.id, e.target.files); setSelected(claim); e.target.value=''; } }} />
                                </label>
                              )}
                            </div>
                            <div className="mt-1 flex gap-3 flex-wrap">
                              {(it.receipts||[]).length === 0 && <span className="text-slate-500">No receipts</span>}
                              {(it.receipts||[]).map(r => (
                                <div key={r.id} className="relative">
                                  {r.mime_type && r.mime_type.startsWith('image/') ? (
                                    <a href={r.url} target="_blank" rel="noreferrer" className="block">
                                      <img alt="receipt" className="h-14 w-14 object-cover rounded border" src={r.url} />
                                    </a>
                                  ) : (
                                    <a className="inline-flex items-center px-2 py-1 text-xs border rounded bg-white text-sky-700 hover:underline" href={r.url} target="_blank" rel="noreferrer">View</a>
                                  )}
                                  {can('travel.claim.update') && (
                                    <button title="Remove" onClick={async ()=>{ const claim = await deleteClaimItemReceipt(selected.id, it.id, r.id); setSelected(claim); }} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-5 w-5 text-xs">×</button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="p-3 text-right text-sm font-medium">Total Claimed: {sum(selected.items)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
