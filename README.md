# olivia's room — 3D 粉丝房间

参考 `../o8I5OLPivGIJkDgDAgAPE2BGAiAhIAb87Aisa~noop.jpeg` 的插画做成的 three.js 网页：去掉了卡通人物，墙上换成真实照片，专辑用真实封面，其余物件保持卡通风格（toon 着色 + 描边）。

## 运行

ES module 需要通过 http 打开（直接双击 html 不行）：

```bash
python -m http.server 5187 --directory oliviarodrigo/site
```

然后打开 http://localhost:5187 。three.js 从 jsDelivr 加载，照片和封面从 Wikimedia 加载，所以需要联网。

## 结构

| 文件 | 内容 |
|---|---|
| `src/main.js` | 场景、灯光、描边渲染、相机、点击/悬停交互、日夜切换 |
| `src/props.js` | 所有物件：铁艺床头、床、蓬松被子、床头柜、台灯、贝斯、帆布鞋、兔子、彩旗、星星串、照片串灯、唱机、唱片箱 |
| `src/posters.js` | 海报排版（把真实照片/封面画到 canvas 上）+ 图片加载 |
| `src/textures.js` | 程序化花纹：玫瑰布料、波点、条纹/格子、木地板、墙面 |
| `src/photos.js` | 墙上照片（Wikimedia Commons，公有领域 / CC BY），含作者与授权 |
| `src/albums.js` | SOUR、GUTS、you seem pretty sad for a girl so in love、drop dead 的封面与曲目 |

要换海报，改 `main.js` 里的 `POSTERS` 数组：`photo` 对应 `photos.js` 的 key，`design` 是 `posters.js` 里的版式（`photo`、`title2026`、`tour`、`tracklist`、`stars`、`gutsPhoto`、`dropdead`、`ysps`、`sour`）。

## 版权

照片按各自的 CC BY / 公有领域授权使用，网页右上角“图片来源”里列出了作者和链接。专辑封面 © Geffen Records，仅限非商业粉丝用途。
