const axios = require('axios');
const cheerio = require('cheerio');

const IS_DEV = process.env.NODE_ENV === 'development';


const CONFIG = {
  BASE_URL: 'https://www.stats.gov.cn/sj/tjbz/tjyqhdmhcxhfdm/2023',
  HOME_PAGE: 'index.html',
};

/**
 * 区域条目
 *
 * @typedef {object} AreaItem
 * @property {('Province' | 'City' | 'County')} category - 类别
 * @property {string} name - 名称
 * @property {string} code - 编码
 * @property {string} page - 页面
 * @property {(string | null)} parentCode - 上级区域编码
 */

export class AreaDataSpider {
  CATEGORY = {
    Province: 'Province',
    City: 'City',
    County: 'County',
  };

  async run() {
    const provinceList = await this.getProvinceList();
    const cityList = await this.getCityList(provinceList);
    const countyList = await this.getCountyList(cityList);

    console.log(countyList);
  }

  /**
   *
   * @return {Promise<AreaItem[]>}
   *
   * @example example of return value
   *
   * [
   *   { name: '北京市', code: '11', page: '11.html', category: 'Province' },
   *   // ...
   * ]
   */
  async getProvinceList() {
    const $ = await this.fetchPageContent(CONFIG.HOME_PAGE);

    const list = [];
    const category = this.CATEGORY.Province;

    /**
     * @example
     * <tr class="provincetr">
     *  <td>
     *    <a href="11.html">北京市<br></a>
     *  </td>
     *  <td>
     *    <a href="12.html">天津市<br></a>
     *  </td>
     * </tr>
     */
    $('td.provincetr > a[href*=".html"]').each((index, el) => {
      const $el = $(el);
      const name = $el.text().trim();
      const page = $el.attr('href').trim();
      const code = page.replace('.html', '').trim();

      list.push({ category, name, code, page, parentCode: null });
    });

    return list;
  }

  /**
   * @param parentAreaList {AreaItem[]}
   * @return {Promise<AreaItem[]>}
   */
  async getCityList(parentAreaList) {
    const list = [];
    const category = this.CATEGORY.City;

    for (const area of parentAreaList) {
      const { code: parentCode, page: parentPage } = area;

      if (IS_DEV && parentCode !== '42') {
        continue;
      }

      const $ = await this.fetchPageContent(parentPage);

      /**
       * @example
       *     <tr class="citytr">
       *       <td>
       *         <a href="42/4202.html">420200000000</a>
       *       </td>
       *       <td>
       *         <a href="42/4202.html">黄石市</a>
       *       </td>
       *     </tr>
       */
      $('tr.citytr').each((index, el) => {
        const $tr = $(el);

        const $firstAnchor = $tr.find('td:eq(0) a');
        const $secondAnchor = $tr.find('td:eq(1) a');

        const code = $firstAnchor.text().trim();
        const page = $firstAnchor.attr('href').trim();
        const name = $secondAnchor.text().trim();

        list.push({ category, name, code, page, parentCode });
      });
    }

    return list;
  }

  /**
   * @param parentAreaList {AreaItem[]}
   * @return {Promise<AreaItem[]>}
   */
  async getCountyList(parentAreaList) {
    const list = [];
    const category = this.CATEGORY.County;

    for (const area of parentAreaList) {
      const { code: parentCode, page: parentPage } = area;

      if (IS_DEV && parentCode !== '421100000000') {
        continue;
      }

      const $ = await this.fetchPageContent(parentPage);

      /**
       * @example
       *   <tr class="countytr">
       *     <td>421101000000</td>
       *     <td>市辖区</td>
       *   </tr>
       *   <tr class="countytr">
       *     <td>
       *       <a href="11/421102.html">421102000000</a>
       *     </td>
       *     <td>
       *       <a href="11/421102.html">黄州区</a>
       *     </td>
       *   </tr>
       */
      $('tr.countytr').each((index, el) => {
        const $tr = $(el);

        const $firstAnchor = $tr.find('td:eq(0)');
        const $secondAnchor = $tr.find('td:eq(1)');

        const code = $firstAnchor.text().trim();
        const name = $secondAnchor.text().trim();
        const page = null;

        list.push({ category, name, code, page, parentCode });
      });
    }

    return list;
  }


  async fetchPageContent(page, baseUrl = CONFIG.BASE_URL) {
    const url = joinUrl(baseUrl, page);

    const { data: html } = await axios.get(url);

    return cheerio.load(html);
  }
}

// --

function joinUrl(...urls) {
  return urls
    // Remove slashes before and after
    .map((path) => path.replace(/^\/+/, '').replace(/\/+$/, ''))
    .join('/')
  ;
}

