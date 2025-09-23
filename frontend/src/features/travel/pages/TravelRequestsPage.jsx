import React, { useEffect, useState } from 'react';
import { getTravelRequests, getTravelRequest, createTravelRequest, updateTravelRequest, submitTravelRequest } from '../../../services/travelService';
import { uploadRequestDocuments, listRequestDocuments, deleteRequestDocument } from '../../../services/travelService';
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

const Select = (props) => (
  <select {...props} className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${props.className||''}`} />
);

export default function TravelRequestsPage() {
  const can = useAuthStore(s => s.can);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ purpose: '', destination: '', departure_date: '', return_date: '', transport_mode: '', estimated_cost: '' });

  // detail state
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTravelRequests();
      setList(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const onCreate = async () => {
    await createTravelRequest({ ...form, estimated_cost: parseFloat(form.estimated_cost||0) });
    setForm({ purpose: '', destination: '', departure_date: '', return_date: '', transport_mode: '', estimated_cost: '' });
    await load();
  };

  const onSubmit = async (id) => {
    await submitTravelRequest(id);
    await load();
  };

  const openDetail = async (r) => {
    setOpen(true);
    setSelected(null);
    setDocs([]);
    setDocsLoading(true);
    try {
      const full = await getTravelRequest(r.id);
      setSelected(full);
      // server includes documents; fallback to list API
      setDocs(full.documents || await listRequestDocuments(r.id));
    } finally { setDocsLoading(false); }
  };

  const onDeleteDoc = async (docId) => {
    if (!selected) return;
    await deleteRequestDocument(selected.id, docId);
    const refreshed = await listRequestDocuments(selected.id);
    setDocs(refreshed);
  };

  const onUploadDocs = async (files) => {
    if (!selected || !files?.length) return;
    await uploadRequestDocuments(selected.id, files);
    const refreshed = await listRequestDocuments(selected.id);
    setDocs(refreshed);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Travel Requests</h1>
      </div>

      {can('travel.create') && (
        <Card>
          <Header title="New Request" />
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Purpose</label>
              <Input name="purpose" value={form.purpose} onChange={onChange} placeholder="e.g., Market visit" />
            </div>
            <div>
              <label className="text-sm text-slate-600">Destination</label>
              <Input name="destination" value={form.destination} onChange={onChange} placeholder="City/Location" />
            </div>
            <div>
              <label className="text-sm text-slate-600">Departure Date</label>
              <Input type="date" name="departure_date" value={form.departure_date} onChange={onChange} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Return Date</label>
              <Input type="date" name="return_date" value={form.return_date} onChange={onChange} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Transport Mode</label>
              <Select name="transport_mode" value={form.transport_mode} onChange={onChange}>
                <option value="">Select</option>
                <option value="Office Vehicle">Office Vehicle</option>
                <option value="Public Transport">Public Transport</option>
                <option value="Bike">Bike</option>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-600">Estimated Cost</label>
              <Input name="estimated_cost" value={form.estimated_cost} onChange={onChange} placeholder="0" />
            </div>
          </div>
          <div className="p-4 border-t border-slate-200 flex justify-end">
            <button onClick={onCreate} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg">Create</button>
          </div>
        </Card>
      )}

      <Card>
        <Header title="All Requests" />
        <div className="divide-y">
          {loading && <div className="p-4 text-slate-500">Loading...</div>}
          {!loading && list.length === 0 && <div className="p-6 text-slate-500">No requests found</div>}
          {list.map(r => (
            <div key={r.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium text-slate-800">{r.purpose || '—'} <span className="text-slate-400">→</span> {r.destination || '—'}</div>
                <div className="text-slate-500">{r.departure_date?.slice(0,10)} to {r.return_date?.slice(0,10)} · {r.transport_mode || '—'}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs ${r.status==='PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700' : r.status==='APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{r.status}</span>
                <button onClick={() => openDetail(r)} className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 border">View</button>
                {can('travel.submit') && r.status === 'DRAFT' && (
                  <button onClick={() => onSubmit(r.id)} className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white">Submit</button>
                )}
                {can('travel.update') && (
                  <label className="px-3 py-1 rounded-md bg-slate-200 text-slate-700 cursor-pointer">
                    Upload Docs
                    <input type="file" multiple className="hidden" onChange={async (e)=>{ if(e.target.files?.length){ await uploadRequestDocuments(r.id, e.target.files); e.target.value=''; } }} />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Detail modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50" onClick={()=>setOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-semibold text-slate-800">Request Details</div>
              <button onClick={()=>setOpen(false)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="p-4 space-y-4">
              {!selected && <div className="text-slate-500">Loading...</div>}
              {selected && (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500">Purpose</div>
                      <div className="font-medium text-slate-800">{selected.purpose || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Destination</div>
                      <div className="font-medium text-slate-800">{selected.destination || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Dates</div>
                      <div className="font-medium text-slate-800">{selected.departure_date?.slice(0,10)} → {selected.return_date?.slice(0,10)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Transport</div>
                      <div className="font-medium text-slate-800">{selected.transport_mode || '—'}</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-slate-800">Documents</div>
                      {can('travel.update') && (
                        <label className="px-3 py-1 rounded-md bg-slate-200 text-slate-700 cursor-pointer">
                          Upload
                          <input type="file" multiple className="hidden" onChange={async (e)=>{ if(e.target.files?.length){ await onUploadDocs(e.target.files); e.target.value=''; } }} />
                        </label>
                      )}
                    </div>
                    <div className="mt-2 rounded-lg border border-slate-200 divide-y">
                      {docsLoading && <div className="p-3 text-sm text-slate-500">Loading...</div>}
                      {!docsLoading && docs.length === 0 && <div className="p-3 text-sm text-slate-500">No documents</div>}
                      {!docsLoading && docs.map(d => (
                        <div key={d.id} className="p-3 flex items-center justify-between text-sm">
                          <a className="text-sky-700 hover:underline" href={`/${d.file_path}`} target="_blank" rel="noreferrer">{d.document_name || d.file_path?.split('/').pop()}</a>
                          {can('travel.update') && (
                            <button className="text-red-600 hover:underline" onClick={()=>onDeleteDoc(d.id)}>Delete</button>
                          )}
                        </div>
                      ))}
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
