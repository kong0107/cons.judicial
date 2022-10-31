import * as fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import download from './lib/download.mjs';
import parseTable from './lib/parseTable.mjs';
import toCSV from './lib/toCSV.mjs';

await fs.mkdir('./source/40', {recursive: true});
const summary = [];

for(let href = '/docdata.aspx?fid=40&page=1', counter = 0; href;) {
    const filepath = './source/' + encodeURIComponent(href.split('/').pop()) + '.html';
    await download('https://cons.judicial.gov.tw' + href, filepath);

    const html = await fs.readFile(filepath);
    const document = (new JSDOM(html)).window.document;
    const anchors = document.querySelectorAll('[href^="/docdata.aspx?fid=40&id="]');

    let hasNew = false;
    for(let anchor of anchors) {
        const id = (new URLSearchParams(anchor.href)).get('id');
        const [, year, word, number] = anchor.textContent.match(/^(\d+)年度?(.+)字第(\d+)號(\(|$)/); // exception: 339927
        const source = `./source/40/${id}.html`;

        try {
            await fs.access(source, fs.constants.R_OK);
        } catch(err) {
            await new Promise(r => setTimeout(r, 1000));
            await download('https://cons.judicial.gov.tw' + anchor.href, source);
            hasNew = true;
        }
        // console.log('Parsing', source);
        const html = await fs.readFile(source);

        const document = (new JSDOM(html)).window.document;
        const data = Object.assign(
            {id, '類型': '程序裁定'},
            parseTable(document)
        );

        summary.push({
            id,
            '日期': data['裁定日期'],
            '字號': (data['裁定字號'] || data['原分案號']).replaceAll(/[年度字第號]/g, ''), // exception: 339927
        });
        await fs.mkdir(`./docket/${year}/${word}/`, {recursive: true});
        await fs.writeFile(`./docket/${year}/${word}/${number}.json`, JSON.stringify(data, null, '\t'));
        if(!(++counter % 50)) process.stdout.write('.');
    }
    if(!hasNew) {
        process.stdout.write('\nIt seems there is no new decisions.');
        break;
    }
    href = document.querySelector('[id$=paging_next]')?.href;
}
process.stdout.write('\n');

await fs.writeFile('./docket/程序裁定.csv', toCSV(
    summary, ['id', '日期', '字號']
));
