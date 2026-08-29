# 首页图片出处与授权

首页（`frontend/src/views/HomePage.vue`）使用的古典画作，全部取自 Wikimedia Commons。
下列元数据是从 Commons API 逐个查询得到的，不是凭印象填写。

改图或加图时请同步更新本文件——这是商业站点，出处需要可追溯。

## 首页画廊墙（MountainJourney 组件，现版本）

不再是"一张全屏画换下一张"，改成几幅欧洲数学家肖像画常驻铺在暗底上，
滚动时靠亮度/大小做聚光灯式的过渡。用到两组图，都是之前就下载好、
核实过授权的素材，这次是换了个用法，没有新下载：

- **常驻背景**：`frontend/public/art/hero.jpg`，拉斐尔《雅典学院》，压得很暗很虚，
  只做画廊墙的底色和纵深，出处见下面"数学家肖像"表格上方那条记录。
- **画廊墙上的六幅肖像**：欧几里得、牛顿、柯西、欧拉、高斯、拉普拉斯，
  出处见下面"数学家肖像"表格，用法见 `MountainJourney.vue` 的 `TILES` 数组。

## 水墨山水（上一版用过，现已停用）

上一版首页用的是三段水墨山水叙事，用户反馈"像在翻页"、且要求换回欧洲数学家
油画风格后弃用。文件还留在仓库里，没有删除：

| 文件 | 作品 | 作者 | 年代 | 授权 |
| --- | --- | --- | --- | --- |
| `frontend/public/art/mountain-1.jpg` | 《早春图》（Early Spring） | 郭熙 Guo Xi | 1072 | Public domain |
| `frontend/public/art/mountain-2.jpg` | 《谿山行旅图》（Travelers Among Mountains and Streams） | 范宽 Fan Kuan | 约 1000 | Public domain |
| `frontend/public/art/mountain-3.jpg` | 《四季山水图·冬》（Landscape of Four Seasons: Winter） | 雪舟 Sesshū Tōyō | 室町时代，15 世纪 | Public domain |

## 首图 / 常驻背景

| 文件 | 作品 | 作者 | 年代 | 授权 |
| --- | --- | --- | --- | --- |
| `frontend/public/art/hero.jpg` | 《雅典学院》（The School of Athens） | Raphael（拉斐尔） | 1511 | Public domain |

## 数学家肖像

| 文件 | 人物 | 作者 | 年代 | 授权 |
| --- | --- | --- | --- | --- |
| `portraits/euclid.jpg` | 欧几里得 | Jusepe de Ribera | 约 1630–1635 | Public domain |
| `portraits/newton.jpg` | 牛顿 | James Thronill，摹自 Godfrey Kneller | 1689 | Public domain |
| `portraits/euler.jpg` | 欧拉 | Jakob Emanuel Handmann | 1753 | Public domain |
| `portraits/gauss.jpg` | 高斯 | Christian Albrecht Jensen | 1840 | Public domain |
| `portraits/cauchy.jpg` | 柯西 | Rudolf Hoffmann（1820–1882） | 1856 | Public domain |
| `portraits/laplace.jpg` | 拉普拉斯 | Wellcome Collection 藏石版画 | 19 世纪 | **CC BY 2.0** |

（`portraits/` 相对于 `frontend/public/`。）

## 需要注意：拉普拉斯这张不是公有领域

其余六张都是 Public domain，用起来没有任何附加义务。
**只有 `laplace.jpg` 是 CC BY 2.0**——画作本身早已过版权期（拉普拉斯卒于 1827 年），
但 Wellcome Collection 对其扫描件主张了 CC BY，商用允许，条件是署名。

因此本文件即为署名载体；若首页将来要撤掉本文件，需要在页面上保留一处可见的出处说明：

> Portrait of Pierre-Simon Laplace. Wellcome Collection. CC BY 4.0

若想彻底免除这项义务，可换成 Musée Carnavalet 藏 David d'Angers 1835 年的
拉普拉斯像（CC0，无任何条件），但那是一件**雕塑**，与其余五张画像风格不统一，
所以当前没有采用。

## 更换图片

- 换画廊墙上的肖像：改 `MountainJourney.vue` 里 `TILES` 数组的 `src` 字段，图片放 `frontend/public/portraits/`
- 换常驻背景：改 `MountainJourney.vue` 里 `.backdrop img` 的 `src`（当前写死为 `hero.jpg`）
- 换"名录"板块的肖像（不同于画廊墙，是首页下方单独一节）：改 `HomePage.vue` 的 `figures` 数组里的 `portrait` 字段
- 裁切不满意：调 `.tile img` / `.backdrop img` 的 `object-position`，或 `.figure-frame img` 的 `object-position`
