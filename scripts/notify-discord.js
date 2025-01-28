import { readFileSync } from 'fs';
import { join } from 'path';

try {
    const config = JSON.parse(readFileSync(join(process.cwd(), 'config.local.json'), 'utf8'));
    
    fetch(config.discordWebhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            content: "New version of Substrate deployed! Play it here: https://drewww.itch.io/substrate?secret=jd2lr925BVAg1yMjxnxLq1xJJA"
        })
    });
} catch (error) {
    console.error('Failed to send Discord notification:', error);
} 