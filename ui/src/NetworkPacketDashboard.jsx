import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Upload,
  Download,
  Filter,
  AlertTriangle,
  Shield,
  Activity,
  Network,
  Eye,
  RefreshCw,
  Trash2,
  FileText,
  Globe
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8080/api';

const NetworkPacketDashboard = () => {
  const [captureStatus, setCaptureStatus] = useState({ is_capturing: false, packets_captured: 0, packets_analyzed: 0 });
  const [packets, setPackets] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [filters, setFilters] = useState({ protocol: '', src_ip: '', dst_ip: '', suspicious_only: false, malicious_only: false });
  const [isLoading, setIsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [captureParams, setCaptureParams] = useState({ interface: '', packet_count: 100, timeout: 60, filter: '' });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPackets, setTotalPackets] = useState(0);

  const fileInputRef = useRef(null);
  const refreshInterval = useRef(null);

  const apiCall = async (endpoint, options = {}) => {
    try {
      const res = await fetch(\`\${API_BASE_URL}\${endpoint}\`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(\`HTTP \${res.status} - \${t}\`);
      }
      if (res.status === 204) return null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) return await res.json();
      return await res.text();
    } catch (err) {
      console.error('apiCall error', err);
      throw err;
    }
  };

  const fetchCaptureStatus = async () => {
    try {
      const s = await apiCall('/capture/status');
      setCaptureStatus(prev => ({ ...prev, ...s }));
    } catch (e) { console.warn(e); }
  };

  const fetchPackets = async (pg = page) => {
    try {
      const qp = new URLSearchParams();
      qp.append('page', pg);
      qp.append('page_size', pageSize);
      Object.entries(filters).forEach(([k,v]) => { if (v !== '' && v !== false && v !== null) qp.append(k, v); });
      const res = await apiCall('/packets?' + qp.toString());
      setPackets(res.packets || []);
      setTotalPackets(res.total || (res.packets || []).length);
    } catch (e) { console.warn(e); }
  };

  const fetchStatistics = async () => {
    try {
      const res = await apiCall('/statistics');
      setStatistics(res || {});
    } catch (e) { console.warn(e); }
  };

  const fetchAlerts = async () => {
    try {
      const res = await apiCall('/alerts');
      setAlerts(res.alerts || []);
    } catch (e) { console.warn(e); }
  };

  const startCapture = async () => {
    setIsLoading(true);
    try {
      await apiCall('/capture/start', { method: 'POST', body: JSON.stringify(captureParams) });
      setCaptureStatus(s => ({ ...s, is_capturing: true }));
      if (refreshInterval.current) clearInterval(refreshInterval.current);
      refreshInterval.current = setInterval(() => {
        fetchCaptureStatus(); fetchPackets(); fetchStatistics(); fetchAlerts();
      }, 2000);
    } catch (e) { alert('Start failed: ' + e.message); }
    finally { setIsLoading(false); }
  };

  const stopCapture = async () => {
    setIsLoading(true);
    try {
      await apiCall('/capture/stop', { method: 'POST' });
      setCaptureStatus(s => ({ ...s, is_capturing: false }));
      if (refreshInterval.current) { clearInterval(refreshInterval.current); refreshInterval.current = null; }
      await fetchPackets(); await fetchCaptureStatus();
    } catch (e) { alert('Stop failed: ' + e.message); }
    finally { setIsLoading(false); }
  };

  const uploadPcapFile = async (file) => {
    if (!file) return;
    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('http://localhost:8081/api/pcap/upload', { method: 'POST', body: fd });
      if (!res.ok) { const t = await res.text(); throw new Error(t); }
      alert('PCAP uploaded');
      await fetchPackets(); await fetchStatistics(); await fetchAlerts();
    } catch (e) { alert('Upload failed: ' + e.message); }
    finally { setIsLoading(false); fileInputRef.current && (fileInputRef.current.value = ''); }
  };

  const exportData = async (format='json') => {
    try {
      const res = await fetch('/api/export', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ format, include_raw: true }) });
      if (!res.ok) { const t = await res.text(); throw new Error(t); }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = \`packets.\${format}\`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (e) { alert('Export failed: ' + e.message); }
  };

  const clearData = async () => {
    if (!confirm('Clear all data?')) return;
    try { await apiCall('/clear', { method: 'POST' }); setPackets([]); setStatistics({}); setAlerts([]); setTotalPackets(0); alert('Cleared'); } catch (e) { alert('Clear failed: ' + e.message); }
  };

  useEffect(() => {
    fetchCaptureStatus(); fetchPackets(); fetchStatistics(); fetchAlerts();
    return () => { if (refreshInterval.current) clearInterval(refreshInterval.current); };
    // eslint-disable-next-line
  }, []);

  const DashboardStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Packets</p>
            <p className="text-3xl font-bold text-gray-900">{statistics.basic_statistics?.packets_analyzed ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Captured: {captureStatus.packets_captured ?? 0}</p>
          </div>
          <Activity className="h-8 w-8 text-blue-500" />
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Suspicious</p>
            <p className="text-3xl font-bold text-yellow-600">{statistics.security_statistics?.suspicious_detected ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Investigate</p>
          </div>
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Malicious</p>
            <p className="text-3xl font-bold text-red-600">{statistics.security_statistics?.malicious_detected ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Action</p>
          </div>
          <Shield className="h-8 w-8 text-red-500" />
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Unique IPs</p>
            <p className="text-3xl font-bold text-green-600">{(statistics.network_overview?.unique_source_ips ?? 0) + (statistics.network_overview?.unique_destination_ips ?? 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Sources + Destinations</p>
          </div>
          <Globe className="h-8 w-8 text-green-500" />
        </div>
      </div>
    </div>
  );

  const ProtocolChart = () => {
    const protocols = statistics.protocol_distribution || {};
    const total = Object.values(protocols).reduce((s, c) => s + c, 0);
    const palette = ['bg-blue-500','bg-indigo-500','bg-green-500','bg-yellow-500','bg-orange-500','bg-red-500'];
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Protocol Distribution</h3>
        <div className="space-y-3">
          {Object.entries(protocols).length === 0 && <p className="text-sm text-gray-500">No data yet.</p>}
          {Object.entries(protocols).map(([protocol, count], idx) => {
            const pct = total > 0 ? Math.round((count/total)*100) : 0;
            const color = palette[idx % palette.length];
            return (
              <div key={protocol} className="flex items-center justify-between">
                <div className="w-48">
                  <div className="text-sm font-medium">{protocol}</div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                    <div className={\`\${color} h-2 rounded-full\`} style={{width:\`\${pct}%\`}} />
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">{count}</span>
                  <span className="text-xs text-gray-400">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const RecentAlerts = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Security Alerts</h3>
        <button className="text-sm px-3 py-1 rounded border" onClick={fetchAlerts}><RefreshCw className="h-4 w-4" /></button>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {alerts.length===0 && <p className="text-sm text-gray-500">No alerts.</p>}
        {alerts.slice(0,10).map(a => (
          <div key={a.id || Math.random()} className={\`p-3 rounded-lg border-l-4 \${a.severity==='high'?'border-red-500 bg-red-50':a.severity==='medium'?'border-yellow-500 bg-yellow-50':'border-blue-500 bg-blue-50'}\`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{a.type}</p>
                <p className="text-xs text-gray-600 mt-1">{a.description}</p>
                <p className="text-xs text-gray-500 mt-1">{a.source_ip} → {a.destination_ip}</p>
                <p className="text-xs text-gray-400 mt-1">{a.timestamp}</p>
              </div>
              <span className={\`px-2 py-1 text-xs font-medium rounded \${a.severity==='high'?'bg-red-100 text-red-800':a.severity==='medium'?'bg-yellow-100 text-yellow-800':'bg-blue-100 text-blue-800'}\`}>{(a.severity||'low').toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const PacketTable = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Captured Packets</h3>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded border" onClick={() => fetchPackets(page)}><RefreshCw className="h-4 w-4" /></button>
          <button className="px-3 py-1 rounded border text-red-600" onClick={clearData}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[420px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proto</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {packets.length===0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">No packets to display.</td></tr>
            )}
            {packets.map((pkt, idx) => (
              <tr key={pkt.id || idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{(page-1)*pageSize + idx + 1}</td>
                <td className="px-4 py-3 text-sm">{new Date(pkt.timestamp || Date.now()).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium">{pkt.src_ip || pkt.src || '—'}</div>
                  <div className="text-xs text-gray-500">{pkt.src_port ? `:${pkt.src_port}` : ''}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium">{pkt.dst_ip || pkt.dst || '—'}</div>
                  <div className="text-xs text-gray-500">{pkt.dst_port ? `:${pkt.dst_port}` : ''}</div>
                </td>
                <td className="px-4 py-3 text-sm">{pkt.protocol || '—'}</td>
                <td className="px-4 py-3 text-sm text-right">{pkt.length || pkt.size || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={\`inline-flex items-center px-2 py-1 text-xs rounded \${pkt.label?.toLowerCase().includes('malicious')?'bg-red-100 text-red-800':pkt.label?.toLowerCase().includes('suspicious')?'bg-yellow-100 text-yellow-800':'bg-green-100 text-green-800'}\`}>{pkt.label || 'UNKNOWN'}</span>
                </td>
                <td className="px-4 py-3 text-center text-sm space-x-2">
                  <button className="px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 text-xs" onClick={() => alert(JSON.stringify(pkt, null, 2))}><Eye className="h-4 w-4 inline" /></button>
                  <button className="px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 text-xs" onClick={() => navigator.clipboard?.writeText(JSON.stringify(pkt))}><FileText className="h-4 w-4 inline" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="text-sm text-gray-600">Showing {packets.length} of {totalPackets} packets</div>
        <div className="flex items-center space-x-2">
          <button disabled={page<=1} onClick={() => { setPage(Math.max(1,page-1)); fetchPackets(Math.max(1,page-1)); }} className="px-3 py-1 rounded border text-sm disabled:opacity-50">Prev</button>
          <span className="text-sm text-gray-700">Page {page}</span>
          <button disabled={(page*pageSize)>=totalPackets} onClick={() => { setPage(page+1); fetchPackets(page+1); }} className="px-3 py-1 rounded border text-sm disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );

  const TopControls = () => (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <input type="text" placeholder="Interface (e.g., eth0)" value={captureParams.interface} onChange={e => setCaptureParams(p => ({...p, interface: e.target.value}))} className="px-3 py-2 rounded border text-sm w-40" />
          <input type="number" min={1} value={captureParams.packet_count} onChange={e => setCaptureParams(p => ({...p, packet_count: Number(e.target.value)}))} className="px-3 py-2 rounded border text-sm w-28" />
          <input type="number" min={5} value={captureParams.timeout} onChange={e => setCaptureParams(p => ({...p, timeout: Number(e.target.value)}))} className="px-3 py-2 rounded border text-sm w-28" />
          <input type="text" placeholder="BPF filter (optional)" value={captureParams.filter} onChange={e => setCaptureParams(p => ({...p, filter: e.target.value}))} className="px-3 py-2 rounded border text-sm w-48" />
        </div>

        <div className="flex items-center gap-2">
          {!captureStatus.is_capturing ? (
            <button onClick={startCapture} disabled={isLoading} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded shadow hover:bg-green-700"><Play className="h-4 w-4" />Start</button>
          ) : (
            <button onClick={stopCapture} disabled={isLoading} className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded shadow hover:bg-red-700"><Square className="h-4 w-4" />Stop</button>
          )}

          <label className="flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50 cursor-pointer">
            <Upload className="h-4 w-4" />
            <input ref={fileInputRef} type="file" accept=".pcap,.pcapng" className="hidden" onChange={e => uploadPcapFile(e.target.files?.[0])} />
            Upload PCAP
          </label>

          <div className="relative inline-flex">
            <button onClick={() => exportData('json')} className="flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50 text-sm"><Download className="h-4 w-4" />Export</button>
            <div className="ml-2">
              <button onClick={() => { fetchCaptureStatus(); fetchPackets(); fetchStatistics(); fetchAlerts(); }} title="Refresh all" className="px-3 py-2 rounded border hover:bg-gray-50 text-sm"><RefreshCw className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <input type="text" placeholder="src ip" value={filters.src_ip} onChange={e => setFilters(f => ({...f, src_ip: e.target.value}))} className="px-3 py-2 rounded border text-sm w-36" />
          <input type="text" placeholder="dst ip" value={filters.dst_ip} onChange={e => setFilters(f => ({...f, dst_ip: e.target.value}))} className="px-3 py-2 rounded border text-sm w-36" />
          <select value={filters.protocol} onChange={e => setFilters(f => ({...f, protocol: e.target.value}))} className="px-3 py-2 rounded border text-sm">
            <option value="">All protocols</option>
            <option>TCP</option>
            <option>UDP</option>
            <option>HTTP</option>
            <option>DNS</option>
            <option>ICMP</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.suspicious_only} onChange={e => setFilters(f => ({...f, suspicious_only: e.target.checked}))} />Suspicious</label>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.malicious_only} onChange={e => setFilters(f => ({...f, malicious_only: e.target.checked}))} />Malicious</label>
          <button onClick={() => { setPage(1); fetchPackets(1); }} className="flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-gray-50 text-sm"><Filter className="h-4 w-4" />Apply</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Network className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-semibold">Network Packet Dashboard</h1>
              <p className="text-sm text-gray-500">Real-time capture · parsing · classification</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 text-right">
              <div>Capture: <span className={captureStatus.is_capturing ? 'text-green-600 font-medium' : 'text-gray-600 font-medium'}>{captureStatus.is_capturing ? 'LIVE' : 'STOPPED'}</span></div>
              <div className="text-xs text-gray-500">Analyzed: {captureStatus.packets_analyzed ?? 0}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentTab('dashboard')} className={\`px-3 py-2 rounded \${currentTab==='dashboard' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}\`}>Dashboard</button>
              <button onClick={() => setCurrentTab('packets')} className={\`px-3 py-2 rounded \${currentTab==='packets' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}\`}>Packets</button>
              <button onClick={() => setCurrentTab('alerts')} className={\`px-3 py-2 rounded \${currentTab==='alerts' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}\`}>Alerts</button>
              <button onClick={() => setCurrentTab('settings')} className={\`px-3 py-2 rounded \${currentTab==='settings' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}\`}>Settings</button>
            </div>
          </div>
        </div>
      </header>

      <TopControls />

      <main>
        {currentTab === 'dashboard' && (
          <>
            <DashboardStats />
            <div className="grid md:grid-cols-2 gap-6">
              <ProtocolChart />
              <RecentAlerts />
            </div>
          </>
        )}

        {currentTab === 'packets' && (
          <div className="mb-6">
            <PacketTable />
          </div>
        )}

        {currentTab === 'alerts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RecentAlerts />
            <div className="bg-white rounded-lg shadow-md p-6 col-span-2">
              <h3 className="text-lg font-semibold mb-4">Alerts Timeline</h3>
              <p className="text-sm text-gray-500">(timeline / visualization placeholder — implement chart here)</p>
            </div>
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">API Base URL</label>
                <input type="text" value={API_BASE_URL} readOnly className="px-3 py-2 rounded border w-full text-sm bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Retention (days)</label>
                <input type="number" className="px-3 py-2 rounded border w-40" defaultValue={30} />
                <p className="text-xs text-gray-400 mt-1">Set how long to keep packet metadata (raw payloads increase storage).</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
                <button className="px-4 py-2 rounded border">Reset to defaults</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NetworkPacketDashboard;
