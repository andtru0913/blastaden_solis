export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    if (req.body.secret !== process.env.REVALIDATE_SECRET) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    res.status(202).json({ message: 'Revalidation started' });


    const pagePath = '/';

    try {
        await res.revalidate(pagePath);

        return res.json({ message: `Page revalidated successfully!` });
    } catch (error) {
        console.error('Error revalidating page:', error);
        return res.status(500).json({ message: 'Error revalidating the page' });
    }
}
