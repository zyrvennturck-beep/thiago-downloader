// Vercel serverless function - runs on Vercel servers, no CORS issues
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.projectsegfau.lt',
    'https://piped-api.garudalinux.org',
    'https://pa.il.sny.sh',
  ];

  for (const base of PIPED_INSTANCES) {
    try {
      // Search for channel
      const cr = await fetch(`${base}/search?q=${encodeURIComponent(q)}&filter=channels`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (!cr.ok) continue;
      const cd = await cr.json();
      
      const channel = cd?.items?.find(i => i.type === 'channel');
      if (channel?.url) {
        const channelId = channel.url.replace('/channel/', '');
        const vr = await fetch(`${base}/channel/${channelId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000)
        });
        if (!vr.ok) continue;
        const vd = await vr.json();
        const videos = (vd.relatedStreams || []).slice(0, 24).map(v => ({
          id: v.url?.replace('/watch?v=', '') || '',
          title: v.title || 'Untitled',
          dur: fmtDur(v.duration),
          views: fmtNum(v.views),
          date: v.uploadedDate || '',
          author: vd.name || '',
          thumb: v.thumbnail || `https://i.ytimg.com/vi/${v.url?.replace('/watch?v=','')}/mqdefault.jpg`
        })).filter(v => v.id);
        if (videos.length > 0) return res.json({ videos, source: base });
      }

      // Fallback: video search
      const vsr = await fetch(`${base}/search?q=${encodeURIComponent(q)}&filter=videos`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (!vsr.ok) continue;
      const vsd = await vsr.json();
      const videos = (vsd.items || []).filter(i => i.type === 'stream').slice(0, 20).map(v => ({
        id: v.url?.replace('/watch?v=', '') || '',
        title: v.title || 'Untitled',
        dur: fmtDur(v.duration),
        views: fmtNum(v.views),
        date: v.uploadedDate || '',
        author: v.uploaderName || '',
        thumb: v.thumbnail || `https://i.ytimg.com/vi/${v.url?.replace('/watch?v=','')}/mqdefault.jpg`
      })).filter(v => v.id);
      if (videos.length > 0) return res.json({ videos, source: base });
    } catch (e) {
      console.warn('Piped instance failed:', base, e.message);
    }
  }

  return res.status(500).json({ error: 'All search sources failed' });
}

function fmtDur(s) {
  if (!s) return '';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
  if (h) return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  return `${m}:${String(ss).padStart(2,'0')}`;
}
function fmtNum(n) {
  if (!n) return '';
  if (n >= 1e9) return (n/1e9).toFixed(1)+'B';
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
  return String(n);
}
