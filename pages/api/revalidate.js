export const handler = async (event) => {
    const { secret } = JSON.parse(event.body);

    const expectedSecret = process.env.REVALIDATE_SECRET;

    if (!secret || secret !== expectedSecret) {
        return {
            statusCode: 403,
            body: JSON.stringify({ message: 'Forbidden: Invalid secret' }),
        };
    }

    const pagePath = path || '/';

    try {
        const response = await fetch('https://blastaden-solis.vercel.app/api/revalidate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: pagePath, secret: expectedSecret }),
        });

        if (!response.ok) {
            throw new Error(`Revalidation failed with status: ${response.statusText}`);
        }

        const data = await response.json();

        console.log('Revalidation successful:', data);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Page revalidated successfully!' }),
        };
    } catch (error) {
        console.error('Error during revalidation:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error revalidating the page' }),
        };
    }
};
