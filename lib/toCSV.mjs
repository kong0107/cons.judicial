export function toCSV(dataArray, fieldNames) {
    return dataArray.reduce((acc, record) =>
        acc + fieldNames.map(field => csvEscape(record[field])).join(',') + '\r\n'
    , fieldNames.map(csvEscape).join(',') + '\r\n');
}
function csvEscape(text) {
    if(!/[\x00-\x1f\x22\x2c]/.test(text)) return text;
    text = text
        .replaceAll('"', '""')
        .replaceAll(/[\x00-\x1f]/g, m => '\x5cx' + m[0].charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
    ;
    return `"${text}"`;
}
export default toCSV;
