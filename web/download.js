import fs from 'fs';

const images = {
    '1_heatwave.jpg': 'https://images.unsplash.com/photo-1519965306692-a1b7e4fefe95?w=800&q=80', // replacement
    '4_tonga.jpg': 'https://images.unsplash.com/photo-1610444583151-24845cb06283?w=800&q=80',
    '6_ocean.jpg': 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=800&q=80',
    '10_ai.jpg': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80'
};

async function downloadImages() {
    for (const [name, url] of Object.entries(images)) {
        try {
            console.log(`Downloading ${name}...`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Status ${response.status}`);
            
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(`./public/events/${name}`, buffer);
            console.log(`Saved ${name}`);
        } catch (e) {
            console.error(`Failed ${name}: ${e.message}`);
        }
    }
}

downloadImages()
    .then(() => {
        // Copy duplicates for exact events
        fs.copyFileSync('./public/events/3_pakistan_floods.jpg', './public/events/2_europe_floods.jpg');
        console.log('Copied 3 to 2');
        
        fs.copyFileSync('./public/events/5_turkey.jpg', './public/events/7_noto.jpg');
        console.log('Copied 5 to 7');
    })
    .catch(console.error);
