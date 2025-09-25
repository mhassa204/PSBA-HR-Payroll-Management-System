import React, { useEffect, useState } from 'react';
import { getTravelRates, upsertTravelRate, deleteTravelRate } from '../services/travelRateService';
import { scaleGradeService } from '../services/scaleGradeService';

const Input = (p) => <input {...p} className={`border rounded px-2 py-1 text-sm ${p.className||''}`} />;

export default function TravelRateManagement(){
  const [rates,setRates] = useState([]);
  const [grades,setGrades] = useState([]);
  const [form,setForm] = useState({ scale_grade_id:'', rate_per_km:'', per_diem_rate:'' });
  const load = async () => { const [r,g] = await Promise.all([getTravelRates(), scaleGradeService.getAllScaleGrades()]); setRates(r); setGrades(g.scaleGrades||g||[]); };
  useEffect(()=>{ load(); },[]);
  const submit = async (e)=>{ e.preventDefault(); if(!form.scale_grade_id) return; await upsertTravelRate({ ...form, scale_grade_id: Number(form.scale_grade_id) }); setForm({ scale_grade_id:'', rate_per_km:'', per_diem_rate:'' }); load(); };
  const remove = async (id)=>{ if(!window.confirm('Delete rate?')) return; await deleteTravelRate(id); load(); };
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Travel Rates</h1>
      <form onSubmit={submit} className="bg-white border rounded p-4 grid md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-xs text-slate-500">Scale Grade</label>
          <select value={form.scale_grade_id} onChange={e=>setForm(f=>({...f,scale_grade_id:e.target.value}))} className="border rounded px-2 py-1 text-sm w-full">
            <option value="">Select Grade</option>
            {grades.map(g=> <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Rate / KM</label>
          <Input value={form.rate_per_km} onChange={e=>setForm(f=>({...f,rate_per_km:e.target.value}))} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Per Diem Rate</label>
          <Input value={form.per_diem_rate} onChange={e=>setForm(f=>({...f,per_diem_rate:e.target.value}))} />
        </div>
        <div>
          <button className="px-4 py-2 bg-sky-600 text-white rounded text-sm">Save / Update</button>
        </div>
      </form>
      <div className="bg-white border rounded p-4">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 border-b">
            <tr><th className="py-2 text-left">Grade</th><th className="text-left">Rate / KM</th><th className="text-left">Per Diem Rate</th><th></th></tr>
          </thead>
          <tbody>
            {rates.map(r=> (
              <tr key={r.id} className="border-b last:border-none">
                <td className="py-2">{r.scaleGrade?.name}</td>
                <td>{r.rate_per_km}</td>
                <td>{r.per_diem_rate}</td>
                <td className="text-right"><button onClick={()=>remove(r.id)} className="text-red-600 text-xs">Delete</button></td>
              </tr>
            ))}
            {rates.length===0 && <tr><td colSpan={4} className="py-4 text-center text-xs text-slate-400">No rates configured.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
