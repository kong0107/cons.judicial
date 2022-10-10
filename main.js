import * as fs from 'node:fs/promises';
import * as https from 'node:https';
import { JSDOM } from 'jsdom';

const summary = [];
for(let url of [
    'https://cons.judicial.gov.tw/judcurrentNew1.aspx?fid=38',
    'https://cons.judicial.gov.tw/judcurrentNew2.aspx?fid=39'
]) {
    const fid = url.slice(-2);
    const filepath = './source/' + encodeURIComponent(url.split('/').pop()) + '.html';
    await download(url, filepath);

    const html = await fs.readFile(filepath);
    const document = (new JSDOM(html)).window.document;
    const anchors = document.querySelectorAll(`.judgmentListTb [href^="/docdata.aspx?fid=${fid}&id="]`);

    for(let anchor of anchors) {
        await fs.mkdir(`./source/${fid}/`, {recursive: true});

        const id = (new URLSearchParams(anchor.href)).get('id');
        const [, year, word, number] = anchor.textContent.match(/^(\d+)年(.+)字第(\d+)號[(【]/);
        const source = `./source/${fid}/${id}.html`;
        const type = (fid == '38') ? '判決' : '實體裁定';
        const target = `./data/${type}/${year}/${word}${number}.json`;
        await download('https://cons.judicial.gov.tw' + anchor.href, source);

        const html = await fs.readFile(source);
        const document = (new JSDOM(html)).window.document;
        const data = {id, '類型': type};
        document.querySelectorAll(".lawList > ul > li:last-of-type").forEach(item => {
            const key = item.title;
            const value = item.textContent;
            switch(key) {
                case '判決字號': {
                    const match = value.match(/\s*(.+)【(.+)】\s*/);
                    data[key] = match[1];
                    data['標題'] = match[2];
                    break;
                }
                case '判決日期':
                case '裁定日期': {
                    let [, year, month, date] = value.match(/(\d+)年(\d+)月(\d+)日/);
                    year = 1911 + parseInt(year);
                    data[key] = [year, month, date].join('-');
                    break;
                }
                case '裁定字號':
                case '原分案號':
                case '聲請人':
                case '案由':
                case '主筆大法官記載': {
                    data[key] = value.trim();
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
        const brief = {
            id,
            '類型': type,
            '字號': data['裁定字號'] || data['判決字號'],
            '日期': data['裁定日期'] || data['判決日期'],
            '案由': data['案由']
        };
        if(data['標題']) brief['標題'] = data['標題'];
        summary.push(brief);
        await fs.mkdir(`./data/${type}/${year}`, {recursive: true});
        await fs.writeFile(target, JSON.stringify(data, null, '\t'));
    }
}
await fs.writeFile('./data/index.json', JSON.stringify(summary, null, '\0'));

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
