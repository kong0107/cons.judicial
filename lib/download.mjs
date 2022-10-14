import * as fs from 'node:fs/promises';
import * as https from 'node:https';

export async function download(url, filepath) {
    console.log('Downloading', url);
    const fh = await fs.open(filepath, 'w');
    return new Promise((resolve, reject) => {
        const onError = async(err) => {
            await fh.close();
            await fs.unlink(filepath, delErr => {
                if(delErr) console.error(delErr);
                reject(delErr || err);
            });
        };
        const ws = fh.createWriteStream(filepath);
        ws.on('finish', fh.close);
        ws.on('close', resolve);
        ws.on('error', onError);

        const request = https.get(url, res => {
            if(res.statusCode !== 200) return onError(res);
            res.pipe(ws);
        });
        request.on('error', onError);
        request.end();
    });
}

export default download;
