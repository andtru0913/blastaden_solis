export default async function handler(req, res) {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).send('Unauthorized');
    }
  
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      });
  
      res.status(200).json({ revalidated: true });
    } catch (err) {
      res.status(500).send('Cron trigger failed');
    }
  }
  