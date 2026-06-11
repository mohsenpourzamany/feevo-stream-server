const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
app.use(express.json());

// Cookie رو از env variable بخون و فایل بساز
const cookieFile = '/tmp/yt_cookies.txt';
if (process.env.YOUTUBE_COOKIES) {
  const decoded = Buffer.from(process.env.YOUTUBE_COOKIES, 'base64').toString('utf8');
  fs.writeFileSync(cookieFile, decoded);
  console.log('YouTube cookies loaded');
}

app.post('/stream', async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const query = `${title} ${artist}`;
    console.log(`Searching: ${query}`);

    const cookieArg = fs.existsSync(cookieFile) ? `--cookies ${cookieFile}` : '';
    const command = `yt-dlp ${cookieArg} "ytsearch1:${query}" --get-url --format bestaudio --no-playlist --no-warnings`;
    
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
