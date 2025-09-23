import React, { useEffect, useState } from 'react';
import api from '../../../lib/axios';
import { useAuthStore } from '../../auth/authStore';

const Card = ({ children }) => <div className="bg-white rounded-xl shadow-sm border border-slate-200">{children}</div>;
const Header = ({ title, actions }) => (
  <div className="flex items-center justify-between p-4 border-b border-slate-200">
    <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
    <div className="flex gap-2">{actions}</div>
  </div>
);
const Input = (props) => <input {...props} className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${props.className||''}`} />;

function StepRow({ step, onChange, onRemove }) {
  const update = (k, v) => onChange({ ...step, [k]: v });
  return (
    <div className="grid grid-cols-12 gap-3 items-end">
      <div className="col-span-2">
        <label className="text-sm text-slate-600">Order</label>
        <Input type="number" value={step.order} onChange={e=>update('order', Number(e.target.value))} />
      </div>
      <div className="col-span-3">
        <label className="text-sm text-slate-600">Name</label>
        <Input value={step.name} onChange={e=>update('name', e.target.value)} />
      </div>
      <div className="col-span-3">
        <label className="text-sm text-slate-600">Approval Mode</label>
        <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={step.approval_mode} onChange={e=>update('approval_mode', e.target.value)}>
          <option value="ALL">ALL</option>
          <option value="ANY">ANY</option>
          <option value="QUORUM">QUORUM</option>
        </select>
      </div>
      <div className="col-span-2">
        <label className="text-sm text-slate-600">Required</label>
        <Input type="number" value={step.required_count || ''} onChange={e=>update('required_count', e.target.value ? Number(e.target.value) : null)} />
      </div>
      <div className="col-span-2">
        <button className="px-3 py-2 bg-red-600 text-white rounded-lg" onClick={onRemove}>Remove</button>
      </div>
      <div className="col-span-12">
        <label className="text-sm text-slate-600">Dynamic Assignees (JSON)</label>
        <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={JSON.stringify(step.dynamic_assignees || [])} onChange={e=>{
          try { update('dynamic_assignees', JSON.parse(e.target.value)); } catch { /* ignore */ }
        }} />
      </div>
    </div>
  );
}

export default function TravelSettingsPage() {
  const can = useAuthStore(s => s.can);
  const [key, setKey] = useState('travel.request');
  const [def, setDef] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (k) => {
    setLoading(true);
    try {
      const r = await api.get(`/travel/settings/workflows/${k}`);
      setDef(r.data.workflow);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(key); }, [key]);

  const addStep = () => {
    const max = Math.max(0, ...(def?.steps?.map(s=>s.order)||[]));
    setDef(prev => ({ ...prev, steps: [...(prev?.steps||[]), { order: max + 1, name: 'New Step', approval_mode: 'ALL', required_count: null, dynamic_assignees: [] }] }));
  };
  const updateStep = (idx, step) => setDef(prev => ({ ...prev, steps: prev.steps.map((s,i)=> i===idx ? step : s) }));
  const removeStep = (idx) => setDef(prev => ({ ...prev, steps: prev.steps.filter((_,i)=>i!==idx) }));

  const save = async () => {
    await api.put(`/travel/settings/workflows/${key}`, { name: def.name, is_active: def.is_active, steps: def.steps });
    await load(key);
  };

  if (!can('travel.settings.read')) return <div className="text-slate-500">Forbidden</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Travel Settings</h1>
      </div>

      <Card>
        <Header title="Workflow Definition" />
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={key} onChange={e=>setKey(e.target.value)}>
              <option value="travel.request">Travel Request</option>
              <option value="travel.claim">Travel Claim</option>
            </select>
            {def && (
              <>
                <label className="text-sm text-slate-600">Name</label>
                <Input value={def.name} onChange={e=>setDef(prev=>({...prev,name:e.target.value}))} />
                <label className="text-sm text-slate-600">Active</label>
                <input type="checkbox" checked={!!def.is_active} onChange={e=>setDef(prev=>({...prev,is_active:e.target.checked}))} />
              </>
            )}
          </div>

          {loading && <div className="text-slate-500">Loading...</div>}

          {def && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Steps</h3>
                {can('travel.settings.update') && <button className="px-3 py-2 bg-slate-700 text-white rounded-lg" onClick={addStep}>Add Step</button>}
              </div>
              <div className="space-y-4">
                {def.steps?.sort((a,b)=>a.order-b.order).map((s, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200">
                    <StepRow step={s} onChange={st=>updateStep(idx, st)} onRemove={()=>removeStep(idx)} />
                  </div>
                ))}
              </div>
              {can('travel.settings.update') && (
                <div className="flex justify-end">
                  <button className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg" onClick={save}>Save</button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
