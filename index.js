// @ts-nocheck
'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const XLXS = require('xlsx');
/**
 * 抽取京东数据
 */
async function jd() {
    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();

    // 测试页面：https://search.jd.com/Search?keyword=only&enc=utf-8&wq=only&pvid=d691634b78874896a809b6ca7d4dd211
    await page.goto('https://search.jd.com/Search?keyword=麻花&enc=utf-8&wq=麻花&pvid=d691634b78874896a809b6ca7d4dd211');

    // 等待页面加载完成
    await page.waitForSelector('.gl-warp');

    // 按销量排序
    await page.click('.f-sort a:nth-child(2)');
    // 等待页面加载完成
    await page.waitForSelector('.gl-warp');

    // 获取总页数
    let totalPage = await page.evaluate(() => {
        const totalPage = document.querySelector('.p-skip em b').innerText;
        return totalPage;
    });
    // 目前爬取前三页
    totalPage = 3;

    // 全部商品数据
    const allData = [];
    // 循环获取每一页数据
    let pageNum = 1;
    console.log('开始抽取数据，共' + totalPage + '页');
    do {
        // 等待页面加载完成
        await page.waitForSelector('.gl-warp');

        // 滚动条滚动, 加载更多数据
        await page.evaluate(() => {
            window.scrollBy(0, 10000);
        });

        // 延迟等待 timeout
        await delay(5000);

        // 等待页面加载完成
        await page.waitForSelector('.gl-warp');

        // 获取页面数据
        let data = await page.evaluate(() => {
            const items = document.querySelectorAll('.gl-item');
            const result = [];
            items.forEach(item => {
                const title = item.querySelector('.p-name').innerText;
                const price = item.querySelector('.p-price').innerText.replace('￥', '').trim();
                const shop = item.querySelector('.p-shop').innerText;
                const url = item.querySelector('.p-img a').href;
                // 评论数
                const commentTotal = item.querySelector('.p-commit a').innerText;
                result.push({
                    title,
                    price,
                    shop,
                    commentTotal,
                    url
                });
            });
            return result;
        });

        console.log('正在抽取第' + pageNum + '页数据, 共' + data.length + '条');

        // 测试， 保留一条数据
        // data = data.slice(0, 1);
        // 详细数据
        // 循环打开每个商品详情页
        for (let i = 0; i < data.length; i++) {
            // 每10条，延迟等待 5s
            if (i % 10 === 0) {
                await delay(5000);
            }

            const item = data[i];
            const page = await browser.newPage();
            await page.goto(item.url);
            await page.waitForSelector('.sku-name');
            const detail = await page.evaluate(() => {
                // 商品介绍
                const desc = document.querySelector('#detail .tab-con').innerText;

                // 切换到规格与包装
                document.querySelector('#detail .tab-main li:nth-child(2)').click();

                // 规格与包装
                const spec = document.querySelector('#detail .tab-con .Ptable').innerText;

                return {
                    desc,
                    spec,
                };
            });

            // 品牌
            const brand = detail.desc.match(/品牌：([^\n]*)\n/);
            // 商品名称：比比赞饼干
            const name = detail.desc.match(/商品名称：([^\n]*)\n/);
            // 商品编号：100016433732
            const id = detail.desc.match(/商品编号：([^\n]*)\n/);
            // 商品毛重：1.145kg
            const weight = detail.desc.match(/商品毛重：([^\n]*)\n/);
            // 商品产地：中国大陆
            const origin = detail.desc.match(/商品产地：([^\n]*)\n/);
            // 国产/进口：国产
            const market = detail.desc.match(/国产\/进口：([^\n]*)\n/);
            // 净含量：501g-1kg
            const netWeight = detail.desc.match(/净含量：([^\n]*)\n/);
            // 包装形式：箱装
            const packageType = detail.desc.match(/包装形式：([^\n]*)\n/);
            // 口味：混合口味
            const taste = detail.desc.match(/口味：([^\n]*)\n/);
            // 净含量：400g
            const netWeight2 = detail.spec.match(/净含量([^\n]*)\n/);
            // 保质期：180天
            const shelfLife = detail.spec.match(/保质期([^\n]*)\n/);

            // 品牌
            detail.brand = brand ? brand[1].trim() : '';
            // 商品名称：比比赞
            detail.name = name ? name[1].trim() : '';
            // 商品编号：100016;
            detail.id = id ? id[1].trim() : '';
            // 商品毛重：1.145k;
            detail.weight = weight ? weight[1].trim() : '';
            // 商品产地：中国大;
            detail.origin = origin ? origin[1].trim() : '';
            // 国产/进口：国产;
            detail.market = market ? market[1].trim() : '';
            // 净含量：501g-1kg;
            detail.netWeight = netWeight ? netWeight[1].trim() : '';
            // 包装形式：箱装;
            detail.packageType = packageType ? packageType[1].trim() : '';
            // 口味：混合口味;
            detail.taste = taste ? taste[1].trim() : '';
            // 净含量：400g;
            detail.netWeight2 = netWeight2 ? netWeight2[1].trim() : '';
            // 保质期：180天;
            detail.shelfLife = shelfLife ? shelfLife[1].trim() : '';

            item.detail = detail;

            // 保存数据
            allData.push(item);
            console.log('已完成：', i + 1, item.title);
            await page.close();
        }
        console.log('完成第' + pageNum + '页数据采集, data.length=' + data.length);
        // 下一页
        pageNum++;
        await page.click('.pn-next');
    } while (pageNum <= totalPage);

    console.log('采集完成，共' + allData.length + '条数据');
    await browser.close();

    // 保存到excel
    await exportJDData(allData);
}

/**
 * 抽取淘宝数据
 */
async function taobao() {
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    });
    const page = await browser.newPage();
    // 登录页面
    await page.goto('https://login.taobao.com/');
    // 测试页面：https://s.taobao.com/search?q=ONLY&commend=all&ssid=s5-e&search_type=item&sourceId=tb.index&spm=a21bo.jianhua.201856-taobao-item.2&ie=utf8&initiative_id=tbindexz_20170306
    await page.goto('https://s.taobao.com/search?q=%E9%BA%BB%E8%8A%B1&commend=all&ssid=s5-e&search_type=item&sourceId=tb.index&spm=a21bo.jianhua.201856-taobao-item.2&ie=utf8&initiative_id=tbindexz_20170306');
    // 等待页面加载完成
    await page.waitForSelector('.m-itemlist');

    // 按照销量排序
    await page.click('.sorts li.sort:nth-child(2) a');

    // 等待页面加载完成
    await page.waitForSelector('.m-itemlist');

    // 获取总页数
    let totalPage = 3;

    // 全部商品数据
    const allData = [];
    // 循环获取每一页数据
    let pageNum = 1;
    console.log('开始抽取数据，共' + totalPage + '页');
    do {
        // 等待页面加载完成
        await page.waitForSelector('.m-itemlist');

        // 滚动条滚到底部
        await page.evaluate(() => {
            window.scrollBy(0, 10000);
        });

        // 延迟等待 timeout
        await delay(5000);

        // 获取页面数据
        const data = await page.evaluate(() => {
            const items = document.querySelectorAll('.m-itemlist .items .item');
            const result = [];
            items.forEach(item => {
                const title = item.querySelector('.row-2.title a').innerText.replace(/<[^>]+>/g, '').trim();
                const price = item.querySelector('.row-1 .price strong').innerText.replace('￥', '').trim();
                const shop = item.querySelector('.row-3 .shop  > a >span:nth-child(2)').innerText.trim();
                const url = item.querySelector('.row-2 a').href;
                const commentTotal = item.querySelector('.row-1 .deal-cnt').innerText.replace('人收货', '').trim();
                result.push({
                    title,
                    price,
                    shop,
                    commentTotal,
                    url
                });
            });
            return result;
        });
        console.log(data);

        // 循环打开每个商品详情页
        for (let i = 0; i < data.length; i++) {
            // 每10条，延迟等待 5s
            if (i % 10 === 0) {
                await delay(5000);
            }

            const item = data[i];
            const page = await browser.newPage();
            await page.goto(item.url);
            await page.waitForSelector('.attributes-list');
            const detail = await page.evaluate(() => {
                // 商品介绍
                const desc = document.querySelector('.attributes-list').innerText;
                return {
                    desc
                };
            });

            // TODO 参数待确认

            // 品牌
            const brand = detail.desc.match(/品牌：([^\n]*)\n/);
            // 商品名称：比比赞饼干
            const name = detail.desc.match(/商品名称：([^\n]*)\n/);
            // 商品编号：100016433732
            const id = detail.desc.match(/商品编号：([^\n]*)\n/);
            // 商品毛重：1.145kg
            const weight = detail.desc.match(/商品毛重：([^\n]*)\n/);
            // 商品产地：中国大陆
            const origin = detail.desc.match(/商品产地：([^\n]*)\n/);
            // 国产/进口：国产
            const market = detail.desc.match(/国产\/进口：([^\n]*)\n/);
            // 净含量：501g-1kg
            const netWeight = detail.desc.match(/净含量：([^\n]*)\n/);
            // 包装形式：箱装
            const packageType = detail.desc.match(/包装形式：([^\n]*)\n/);
            // 口味：混合口味
            const taste = detail.desc.match(/口味：([^\n]*)\n/);
            // 净含量：400g
            const netWeight2 = detail.spec.match(/净含量([^\n]*)\n/);
            // 保质期：180天
            const shelfLife = detail.spec.match(/保质期([^\n]*)\n/);

            // 品牌
            detail.brand = brand ? brand[1].trim() : '';
            // 商品名称：比比赞
            detail.name = name ? name[1].trim() : '';
            // 商品编号：100016;
            detail.id = id ? id[1].trim() : '';
            // 商品毛重：1.145k;
            detail.weight = weight ? weight[1].trim() : '';
            // 商品产地：中国大;
            detail.origin = origin ? origin[1].trim() : '';
            // 国产/进口：国产;
            detail.market = market ? market[1].trim() : '';
            // 净含量：501g-1kg;
            detail.netWeight = netWeight ? netWeight[1].trim() : '';
            // 包装形式：箱装;
            detail.packageType = packageType ? packageType[1].trim() : '';
            // 口味：混合口味;
            detail.taste = taste ? taste[1].trim() : '';
            // 净含量：400g;
            detail.netWeight2 = netWeight2 ? netWeight2[1].trim() : '';
            // 保质期：180天;
            detail.shelfLife = shelfLife ? shelfLife[1].trim() : '';

            item.detail = detail;

            // 保存数据
            allData.push(item);
            console.log('已完成：', i + 1, item.title);
            await page.close();
        }
        console.log('完成第' + pageNum + '页数据采集, data.length=' + data.length);
        // 下一页
        pageNum++;
        await page.click('.item.next');

    } while (pageNum <= totalPage);

    console.log('采集完成，共' + allData.length + '条数据');
    await browser.close();

    // 保存到excel
    await exportAllData(allData);

}

// 延迟函数
function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

// 保存到excel
async function exportJDData(allData) {
    // 判断有无 "./ouput" 文件夹
    if (!fs.existsSync('./output')) {
        fs.mkdirSync('./output');
    }

    console.log('开始保存数据到excel, 共' + allData.length + '条数据');

    // 新建Excel文件
    let workbook = XLXS.utils.book_new();
    // 写入工作表
    let ws_data = [];
    ws_data.push(['序号', '品牌', '店铺', '标题', '商品编号', '商品名称', '价格', '净含量', '总评价数', '商品毛重', '净含量(区间)', '保质期', '包装', '口味', '商品链接']);
    allData.forEach((item, index) => {
        ws_data.push([
            index + 1,
            item.detail.brand,
            item.shop,
            item.title,
            item.detail.id,
            item.detail.name,
            item.price,
            item.detail.netWeight2,
            item.commentTotal,
            item.detail.weight,
            item.detail.netWeight,
            item.detail.shelfLife,
            item.detail.packageType,
            item.detail.taste,
            item.url
        ]);
    });
    let ws = XLXS.utils.aoa_to_sheet(ws_data);
    // 创建工作簿
    XLXS.utils.book_append_sheet(workbook, ws, '京东数据' + new Date().getFullYear() + (new Date().getMonth() + 1) + new Date().getDate());
    // 导出Excel文件
    let fileName = '京东数据' + new Date().getFullYear() + (new Date().getMonth() + 1) + new Date().getDate() + '.xlsx';
    XLXS.writeFile(workbook, './output/' + fileName);
    console.log('数据保存成功');
    return ws_data.length;
}

(async () => {
    // await jd();
    await taobao();
})();