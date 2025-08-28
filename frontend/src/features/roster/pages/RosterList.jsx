import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import rosterService from '../../roster/services/rosterService';

const RosterList = () => {
  const [data, setData] = useState({ rosters: [], total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await rosterService.list({ page: 1, limit: 20 });
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-slate-800">Duty Rosters</h2>
        <button onClick={() => navigate('/rosters/create')} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md">Create Roster</button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : data.rosters?.length ? (
        <div className="overflow-x-auto bg-white rounded-md shadow">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Title</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Bazaar</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Valid</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Entries</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.rosters.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">{r.id}</td>
                  <td className="px-4 py-2">{r.title || '—'}</td>
                  <td className="px-4 py-2">{r.location?.name || '—'}</td>
                  <td className="px-4 py-2">{new Date(r.valid_from).toLocaleDateString()} → {new Date(r.valid_to).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{r._count?.entries || 0}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/rosters/${r.id}/edit`)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Edit</button>
                      <button onClick={async () => { await rosterService.remove(r.id); load(); }} className="px-3 py-1 text-sm bg-red-600 text-white rounded">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-slate-600">No rosters found.</div>
      )}
    </div>
  );
};

export default RosterList;
