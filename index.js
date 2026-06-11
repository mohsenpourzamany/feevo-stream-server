const express = require('express');
const { exec } = require('child_process');
const app = express();
app.use(express.json());

app.post('/stream', async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const query = `${title} ${artist} official audio`;
    console.log(`Searching: ${query}`);

    const command = `yt-dlp "ytsearch1:${query}" --get-url --format bestaudio --no-playlist --no-warnings`;
    
    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('yt-dlp error:', error.message);
        return res.status(404).json({ error: 'not found' });
      }
      
      const url = stdout.trim().split('\n')[0];
      if (!url) return res.status(404).json({ error: 'no url' });
      
      console.log(`Found URL for: ${title}`);
      res.json({ url });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
