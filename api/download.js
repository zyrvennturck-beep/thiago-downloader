// Proxies cobalt.tools API from server side
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { videoId, quality } = req.body;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const isAudio = quality === 'audio';
  
  const COBALT = [
    'https://cobalt-api.hyper.lol',
    'https://api.cobalt.tools',
    'https://cobalt.api.timelessnesses.me',
  ];

  const body = {
    url: ytUrl,
    downloadMode: isAudio ? 'audio' : 'auto',
    filenameStyle: 'basic',
    ...(isAudio ? { audioBitrate: '192' } : { videoQuality: quality })
  };

  for (const base of COBALT) {
    try {
      const r = await fetch(`${base}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) continue;
      const d = await r.json();
      const dlUrl = d.url || d.picker?.[0]?.url;
      if (dlUrl) return res.json({ url: dlUrl });
    } catch (e) {
      console.warn('cobalt fail:', base);
    }
  }

  // Fallback: return cobalt.tools URL for user to open manually
  return res.json({ fallback: `https://cobalt.tools/?u=${encodeURIComponent(ytUrl)}` });
}
