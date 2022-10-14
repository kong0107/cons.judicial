# cons.judicial

將憲法法庭的裁定、判決下載後逐一整理為 JSON ，
並將字號與類型等摘要結合為 CSV 檔。

利用範例：[憲法法庭裁判查詢](http://kong0107.github.io/cons.judicial/)

## 使用開放資料
資料會同步到 jsDelivr ，可用 `fetch()` （或其他 https request 方法）抓取資料。

### 單一裁判
```js
fetch('https://cdn.jsdelivr.net/gh/kong0107/cons.judicial/docket/111/憲判/1.json')
.then(res => res.json())
.then(judgment => {
    console.log(judgment['判決日期']);
    // 處理單一裁判
});
```

### 所有判決
```js
fetch('https://cdn.jsdelivr.net/gh/kong0107/cons.judicial/docket/判決.csv')
.then(res => res.text())
.then(csv => {
    const records = csv.split('\r\n');
    const fields = records.shift().split(',');
    for(let record of records) {
        // 處理各列資料
    }
});
```

## 開發提醒
* 程序裁定列表似乎是依裁定日期排列，但是資料不一定會依照裁定時間先後公布於網站。
  也就是說，每次都必須檢查每一頁，而不能遇到已經處理過的就停下來。
