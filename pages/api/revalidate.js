export default async function handler(req, res) {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).send('Unauthorized');
    }
  
    try {
      await res.revalidate('/');
      res.status(200).json({ revalidated: true });
    } catch (err) {
      res.status(500).send('Revalidation failed');
    }
  }
  