import * as fs from 'node:fs/promises';
import * as https from 'node:https';
import { JSDOM } from 'jsdom';

const url = 'https://cons.judicial.gov.tw/judcurrentNew1.aspx?fid=38';
const filepath = './source/' + encodeURIComponent(url.split('/').pop()) + '.html';
await download(url, './source/' + filepath);

const html = await fs.readFile(filepath);
const document = (new JSDOM(html)).window.document;
const anchors = document.querySelectorAll(".judgmentListTb [href^='/docdata.aspx?fid=38&id=']");

for(let anchor of anchors) {
    const id = (new URLSearchParams(anchor.href)).get('id');
    const [, year, number, title] = anchor.textContent.match(/^(\d+)年憲判字第(\d+)號【(.+)】$/);
    const source = `source/${id}.html`;
    await download('https://cons.judicial.gov.tw/' + anchor.href, source);

    const html = await fs.readFile(source);
    const document = (new JSDOM(html)).window.document;
    const data = {
        '判決字號': anchor.textContent
    };
    document.querySelectorAll(".lawList > ul > li:last-of-type").forEach(item => {
        const key = item.title;
        switch(key) {
            case '原分案號':
            case '判決日期':
            case '聲請人':
            case '案由':
            case '主筆大法官記載': {
                data[key] = item.textContent.trim();
                break;
            }
            case '主文':
            case '理由': {
                data[key] = [...item.querySelectorAll("pre")].map(
                    pre => pre.textContent.trim().replace(/【\d+】$/, '')
                );
                break;
            }
            case '意見書': {
                data[key] = [...item.querySelectorAll("a")].map(anchor => {
                    const search = anchor.href.substring(anchor.href.indexOf("?"));
                    const id = (new URLSearchParams(search)).get('id');
                    const name = anchor.textContent.trim();
                    return {name, id};
                });
                break;
            }
        }
    });
    await fs.writeFile(`data/${id}.json`, JSON.stringify(data, null, '\t'));
}

/**
 * Functions
 */
async function download(url, filepath) {
    // return;
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
