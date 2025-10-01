import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { listVerifiedClaimsForAccounts, createExpenseTranche, listExpenseTranches, exportExpenseTranche } from '../../../services/travelService';

export default function AccountsTranchesPage(){
  const [filters, setFilters] = useState({ employee_cnic:'', employee_name:'', from_date:'', to_date:'', claim_from:'', claim_to:'', statuses:['VERIFIED'] });
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState({});
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tranches, setTranches] = useState([]);
  const [loadingTranches, setLoadingTranches] = useState(false);

  const load = async () => { setLoading(true); try { const rs = await listVerifiedClaimsForAccounts(filters); setClaims(rs); } finally { setLoading(false);} };
  const loadTranches = async () => { setLoadingTranches(true); try { const rs = await listExpenseTranches(); setTranches(rs); } finally { setLoadingTranches(false);} };
  useEffect(()=>{ load(); loadTranches(); },[]);

  const toggleAll = (on) => { const map = {}; (claims||[]).forEach(c=>{ map[c.id] = !!on; }); setChecked(map); };
  const selectedIds = useMemo(()=> Object.keys(checked).filter(id => checked[id]).map(Number), [checked]);

  const makeTranche = async () => {
    if(selectedIds.length===0){ alert('Select claims to group'); return; }
    if(!window.confirm(`Create tranche with ${selectedIds.length} claim(s) and mark them Processed?`)) return;
    try { const t = await createExpenseTranche({ title, notes, claimIds: selectedIds }); setTitle(''); setNotes(''); setChecked({}); await load(); await loadTranches(); alert(`Tranche ${t.code||t.id} created`); } catch(e){ alert(e?.response?.data?.error || e.message); }
  };

  return (
    <div className="space-y-6 w-full px-2 md:px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts • Tranches</h1>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      {/* Layout: Filters/Claims on top, Tranches below; full-width and responsive */}
      <Card className="w-full">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Filter Accounts-Approved (Verified) Claims</CardTitle>
            <span className="text-[11px] text-muted-foreground hidden md:inline">Only claims already approved by Accounts are listed here</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 text-sm space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div><label className="text-xs text-muted-foreground">CNIC</label><Input value={filters.employee_cnic} onChange={e=>setFilters(f=>({...f,employee_cnic:e.target.value}))} /></div>
            <div><label className="text-xs text-muted-foreground">Employee Name</label><Input value={filters.employee_name} onChange={e=>setFilters(f=>({...f,employee_name:e.target.value}))} /></div>
            <div><label className="text-xs text-muted-foreground">Claim Date From</label><Input type="date" value={filters.from_date} onChange={e=>setFilters(f=>({...f,from_date:e.target.value}))} /></div>
            <div><label className="text-xs text-muted-foreground">Claim Date To</label><Input type="date" value={filters.to_date} onChange={e=>setFilters(f=>({...f,to_date:e.target.value}))} /></div>
            <div><label className="text-xs text-muted-foreground">From Date</label><Input type="date" value={filters.claim_from} onChange={e=>setFilters(f=>({...f,claim_from:e.target.value}))} /></div>
            <div><label className="text-xs text-muted-foreground">To Date</label><Input type="date" value={filters.claim_to} onChange={e=>setFilters(f=>({...f,claim_to:e.target.value}))} /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={load}>Apply</Button>
            <Button size="sm" variant="secondary" onClick={()=>{ setFilters({ employee_cnic:'', employee_name:'', from_date:'', to_date:'', claim_from:'', claim_to:'', statuses:['VERIFIED'] }); }}>Reset</Button>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="font-medium">Results ({claims.length})</div>
            <div className="flex gap-2 items-center">
              <label className="text-xs">Select:</label>
              <Button size="sm" variant="outline" onClick={()=>toggleAll(true)}>All</Button>
              <Button size="sm" variant="outline" onClick={()=>toggleAll(false)}>None</Button>
            </div>
          </div>

          {/* Scrollable list taking available width */}
          <div className="rounded border max-h-[60vh] overflow-auto divide-y">
            {loading && <div className="p-3 text-muted-foreground">Loading...</div>}
            {!loading && claims.length===0 && <div className="p-3 text-muted-foreground">No accounts-approved verified claims match filters.</div>}
            {claims.map(c => {
              const emp = c.employee; const job = emp?.employmentRecords?.[0];
              const hasAccountsApproval = (c.statusEntries||[]).some(se => se.action === 'ACCOUNTS_APPROVED');
              return (
                <div key={c.id} className="p-3 flex items-center justify-between text-sm bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <input type="checkbox" checked={!!checked[c.id]} onChange={e=>setChecked(m=>({...m,[c.id]: e.target.checked}))} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">Claim #{c.id} • {emp?.full_name||'Employee'} <span className="text-muted-foreground">(CNIC: {emp?.cnic||'—'})</span></div>
                      <div className="text-muted-foreground text-xs truncate">Req #{c.travel_request_id||'—'} • From {c.from_date?String(c.from_date).slice(0,10):'—'} → {c.to_date?String(c.to_date).slice(0,10):'—'} • Grand {(c.grand_total||0).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hasAccountsApproval && <Badge variant="secondary" className="text-[10px]">Accounts Approved</Badge>}
                    <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid md:grid-cols-3 gap-3 mt-4">
            <div>
              <label className="text-xs text-muted-foreground">Tranche Title</label>
              <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g., Sep-2025 Batch 1" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Notes</label>
              <Input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional notes" />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button onClick={makeTranche}>Create Tranche & Process</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader className="border-b"><CardTitle>Processed Tranches</CardTitle></CardHeader>
        <CardContent className="p-4 text-sm space-y-3">
          {loadingTranches && <div className="text-muted-foreground">Loading...</div>}
          {!loadingTranches && tranches.length===0 && <div className="text-muted-foreground">No tranches yet.</div>}
          <div className="rounded border divide-y">
            {tranches.map(t => {
              const total = (t.items||[]).reduce((s,it)=> s + Number(it.claim?.grand_total||0), 0);
              return (
                <div key={t.id} className="p-3 flex items-center justify-between text-sm bg-white">
                  <div>
                    <div className="font-medium">{t.title || t.code} <span className="text-muted-foreground">({t.code})</span></div>
                    <div className="text-muted-foreground">Claims: {(t.items||[]).length} • Total: {total.toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={()=>exportTranche(t.id)}>Export CSV</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
