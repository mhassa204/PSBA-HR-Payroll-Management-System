import React, { useEffect, useRef, useState } from "react";
import axios from "../../../lib/axios";

// Type-to-search employee picker. Names repeat heavily in this data (15 "Ali
// Raza", 7 "Muhammad Usman"), so each result shows CNIC, designation and
// posting — enough to pick the right person.
const EmployeePicker = ({ value, initialLabel, onChange, placeholder = "Search employee by name or CNIC…" }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel || "");
  const ref = useRef(null);

  useEffect(() => {
    setSelectedLabel(initialLabel || "");
  }, [initialLabel]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await axios.get("/employees", { params: { search: q, limit: 15, page: 1 } });
        if (cancelled) return;
        const rows = data?.employees || data?.data || [];
        setResults(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const pick = (emp) => {
    const employment = emp.employmentRecords?.[0] || emp.currentEmployment || null;
    setSelectedLabel(emp.full_name);
    setQuery("");
    setOpen(false);
    onChange?.({
      id: emp.id,
      full_name: emp.full_name,
      mobile_number: emp.mobile_number,
      designation: employment?.designation?.title || null,
      posted_at: employment?.location?.name || null,
    });
  };

  return (
    <div className="relative" ref={ref}>
      {value && selectedLabel && !open ? (
        <div className="form-input w-full flex items-center justify-between gap-2">
          <span className="truncate">{selectedLabel}</span>
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline shrink-0"
            onClick={() => {
              setOpen(true);
              setQuery("");
            }}
          >
            change
          </button>
        </div>
      ) : (
        <input
          className="form-input w-full"
          placeholder={placeholder}
          value={query}
          autoFocus={open}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      )}

      {open && (query.trim().length >= 2 || loading) && (
        <div className="absolute z-40 mt-1 w-full max-h-64 overflow-y-auto custom-thin-scroll modal-surface p-1">
          {loading ? (
            <div className="p-3 text-xs text-gray-500">Searching…</div>
          ) : !results.length ? (
            <div className="p-3 text-xs text-gray-500">No employees match “{query}”.</div>
          ) : (
            results.map((emp) => {
              const employment = emp.employmentRecords?.[0] || emp.currentEmployment || null;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => pick(emp)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-50"
                >
                  <div className="text-sm font-medium text-gray-800">{emp.full_name}</div>
                  <div className="text-[11px] text-gray-500">
                    {[emp.cnic, employment?.designation?.title, employment?.location?.name]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeePicker;
