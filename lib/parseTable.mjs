export function parseTable(document) {
    const data = {};
    document.querySelectorAll(".lawList > ul > li:last-of-type").forEach(item => {
        const key = item.title;
        const value = item.textContent.trim();
        switch(key) {
            case '裁定字號':
            case '原分案號':
            case '聲請人':
            case '案由': {
                data[key] = value;
                break;
            }
            case '判決字號': {
                const match = value.match(/^(.+)【(.+)】$/);
                data[key] = match[1];
                data['標題'] = match[2];
                break;
            }
            case '判決日期':
            case '裁定日期': {
                // https://cons.judicial.gov.tw/docdata.aspx?fid=40&id=343869 的日期（曾經）誤植
                let [, minus, year, month, date] = value.match(/^(-?)(\d+)年(\d+)月(\d+)日$/);
                year = minus ? 1900 : 1911 + parseInt(year);
                data[key] = [year, month, date].join('-');
                break;
            }

            case '主文': {
                data[key] = [...item.querySelectorAll("pre")].map(
                    pre => pre.textContent.trim()
                );
                break;
            }

            case '當事人暨當事人陳述之要旨': // exception: 340206
            case '理由': {
                const pres = item.querySelectorAll("pre");
                if(pres.length) data['理由'] = [...pres].map(
                    pre => pre.textContent.trim().replace(/【\d+】$/, '')
                );
                const names = item.querySelectorAll("p.name");
                if(names.length) data['法庭組成'] = [...names].map(p => p.textContent.trim());
                break;
            }

            case '主筆大法官記載': {
                data['主筆'] = value;
                break;
            }

            case '迴避審理本案之大法官': {
                data[key] = value.split('、').map(str => {
                    const match = str.match(/^(.+)大法官(.+)$/);
                    return match[1] + match[2];
                });
                break;
            }

            case '書狀': { // 公開之卷內文書
                data[key] = [...item.querySelectorAll("div.file_list")].reduce((acc, div) => {
                    const key = div.querySelector('strong').textContent.trim();
                    acc[key] = parseDownloadList(div);
                    return acc;
                }, {});
                break;
            }

            case '相關法令': {
                data[key] = [...item.querySelectorAll("a")]
                    .map(anchor => anchor.textContent.trim());
                break;
            }

            case '意見書':
            case '併案':
            case '裁定全文':
            case '判決全文':
            case '確定終局裁判/停止程序裁定':
            case '當事人資料及判決附件':
            case '判決摘要':
            case '大法官就主文所採立場表': {
                data[key] = parseDownloadList(item);
                break;
            }

            default:
                console.error(data['判決字號'] || data['裁定字號'], 'has unknown column', key);
        }
    });
    return data;
}

function parseDownloadList(elem) {
    return [...elem.querySelectorAll("a")].reduce((acc, anchor) => {
        const search = anchor.href.substring(anchor.href.indexOf("?"));
        const id = (new URLSearchParams(search)).get('id');
        const name = anchor.textContent.trim();
        acc[id] = name;
        return acc;
    }, {});
}

export default parseTable;
