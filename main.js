import * as fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import download from './lib/download.mjs';
import parseTable from './lib/parseTable.mjs';
import toCSV from './lib/toCSV.mjs';

const summary = [];
for(let url of [
    'https://cons.judicial.gov.tw/judcurrentNew1.aspx?fid=38',
    'https://cons.judicial.gov.tw/judcurrentNew2.aspx?fid=39'
]) {
    const fid = url.slice(-2);
    const type = (fid == '38') ? '判決' : '實體裁定';
    await fs.mkdir(`./source/${fid}/`, {recursive: true});

    const filepath = './source/' + encodeURIComponent(url.split('/').pop()) + '.html';
    await download(url, filepath);

    const html = await fs.readFile(filepath);
    const document = (new JSDOM(html)).window.document;
    const anchors = document.querySelectorAll(`.judgmentListTb [href^="/docdata.aspx?fid=${fid}&id="]`);

    for(let anchor of anchors) {
        const id = (new URLSearchParams(anchor.href)).get('id');
        const [, year, word, number] = anchor.textContent.match(/^(\d+)年(.+)字第(\d+)號[(【]/);
        const source = `./source/${fid}/${id}.html`;
        const target = `./data/${type}/${year}/${word}${number}.json`;

        try {
            await fs.access(source, fs.constants.R_OK);
        } catch(err) {
            await download('https://cons.judicial.gov.tw' + anchor.href, source);
        }
        const html = await fs.readFile(source);

        const document = (new JSDOM(html)).window.document;
        const data = Object.assign(
            {id, '類型': type},
            parseTable(document)
        );
        const brief = {
            id,
            '類型': type,
            '字號': (data['裁定字號'] || data['判決字號']).replaceAll(/[年字第號]/g, ''),
            '日期': data['裁定日期'] || data['判決日期'],
            '案由': data['案由']
        };
        if(data['標題']) brief['標題'] = data['標題'];
        summary.push(brief);
        await fs.mkdir(`./data/${type}/${year}`, {recursive: true});
        await fs.writeFile(target, JSON.stringify(data, null, '\t'));
    }
}

await fs.writeFile('./data/index.csv', toCSV(
    summary,
    ['id', '日期', '字號', '類型']
));

await fs.writeFile(`./data/判決/index.csv`, toCSV(
    summary.filter(d => d['類型'] === '判決'),
    ['id', '日期', '字號', '標題']
));

await fs.writeFile(`./data/實體裁定/index.csv`, toCSV(
    summary.filter(d => d['類型'] === '實體裁定'),
    ['id', '日期', '字號', '案由']
));
