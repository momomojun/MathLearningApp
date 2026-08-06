# 首页图片出处与授权

首页（`frontend/src/views/HomePage.vue`）使用的古典画作，全部取自 Wikimedia Commons。
下列元数据是从 Commons API 逐个查询得到的，不是凭印象填写。

改图或加图时请同步更新本文件——这是商业站点，出处需要可追溯。

## 首图

| 文件 | 作品 | 作者 | 年代 | 授权 |
| --- | --- | --- | --- | --- |
| `frontend/public/art/hero.jpg` | 《雅典学院》（The School of Athens） | Raphael（拉斐尔） | 1511 | Public domain |

画面中央偏右下为持圆规俯身作图的欧几里得，左下为书写中的毕达哥拉斯。
原图为梵蒂冈签字厅壁画，此处使用 1200px 宽的缩略版（488 KB）以控制首屏体积。

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

- 换首图：改 `HomePage.vue` 中 `.salon` 的 `--stage-art`，图片放 `frontend/public/art/`
- 换肖像：改 `figures` 数组里的 `portrait` 字段，图片放 `frontend/public/portraits/`
- 裁切不满意：调 `.stage-art::before` 的 `background-position`，
  或 `.figure-frame img` 的 `object-position`
