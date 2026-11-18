import { useMemo, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { adminLogs } from '@/lib/api';
import { Input } from '@project/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@project/components/ui/table';
import { Spinner, InlineError, EmptyState } from '../../components/States';
import { useLoad } from '../../lib/useLoad';
import { fmtDateTime } from '../../lib/format';

export default function LogsTab({ type }: { type: 'activity' | 'error' }) {
  const { data, error, loading, reload } = useLoad(`Logs ${type}`, () => adminLogs({ type }), [type]);
  const [q, setQ] = useState('');
  const list = useMemo(() => (data?.logs ?? []).filter((l) => `${l.a} ${l.b} ${l.c} ${l.who}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const head = type === 'activity' ? ['Action', 'Resource', 'Details', 'Administrator', 'Time'] : ['Operation', 'Category', 'Message', 'Correlation ID', 'Time'];
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Logs are written by the server and are read-only - nobody can edit or delete history from the website.</p>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search logs..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {loading ? <Spinner /> : error ? <InlineError error={error} onRetry={reload} /> : !list.length ? <EmptyState icon={ScrollText} title="No log entries" message="Entries will appear here as they are recorded." /> : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table><TableHeader><TableRow>{head.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{list.map((l) => <TableRow key={l.id}><TableCell className="font-medium">{l.a}</TableCell><TableCell>{l.b}</TableCell><TableCell className="max-w-xs truncate text-muted-foreground" title={l.c}>{l.c}</TableCell><TableCell className="font-mono text-xs">{l.who}</TableCell><TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(l.at)}</TableCell></TableRow>)}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
