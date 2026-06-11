const express = require('express');
const YTDlpWrap = require('yt-dlp-wrap').default;
const app = express();
app.use(express.json());

const ytDlp = new YTDlpWrap();

app.post('/stream', async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const query = `${title} ${artist} official audio`;
    console.log(`Searching: ${query}`);

    const results = await ytDlp.execPromise([
      `ytsearch1:${query}`,
      '--get-url',
      '--format', 'bestaudio',
      '--no-playlist',
    ]);

    const url = results.trim().split('\n')[0];
    if (!url) return res.status(404).json({ error: 'not found' });

    console.log(`Found: ${url.substring(0, 80)}...`);
    res.json({ url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
