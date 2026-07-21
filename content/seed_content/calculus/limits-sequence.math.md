@chapter 1 | 函数与极限
@section 1.1 | 数列极限
@subsection 1.1.1 | 核心概念

@text 学习目标
数列极限描述的是：当项数不断增大时，数列的项是否稳定地靠近某个确定的数。

本节需要掌握三件事：
- 用直观语言判断一个数列是否收敛；
- 理解 $\varepsilon-N$ 定义中“最终进入任意小误差范围”的含义；
- 能用基本代数变形计算常见数列极限。

@def 1 | 数列极限
设 $\{a_n\}$ 是一个数列，$A$ 是一个常数。如果对任意 $\varepsilon>0$，总存在正整数 $N$，使得当 $n>N$ 时都有
$$
|a_n-A|<\varepsilon,
$$
则称数列 $\{a_n\}$ 收敛于 $A$，记作
$$
\lim_{n\to\infty}a_n=A.
$$

@table 常见数列极限 | 先记住这些基本模型，再处理复杂变形。
| 数列 | 极限 | 说明 |
| --- | --- | --- |
| $1/n$ | $0$ | 分母无限增大 |
| $(n+1)/n$ | $1$ | 分子分母同阶 |
| $(-1)^n$ | 不存在 | 在 $1$ 与 $-1$ 之间振荡 |

@problem 例题 1 | 计算题 | 基础 | 数列极限,同阶无穷大 | 入门例题
判断数列
$$
a_n=\frac{2n+1}{n+3}
$$
是否收敛，并求它的极限。

@solution 解析
分子分母同时除以 $n$，得到
$$
a_n=\frac{2+1/n}{1+3/n}.
$$
当 $n\to\infty$ 时，$1/n\to0$，所以
$$
\lim_{n\to\infty}a_n=\frac{2}{1}=2.
$$

@subsection 1.1.2 | 图像直觉

@image 数列趋近示意图 | data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20840%20380'%3E%3Crect%20width='840'%20height='380'%20fill='%23fbfcfb'/%3E%3Cline%20x1='70'%20y1='300'%20x2='780'%20y2='300'%20stroke='%23cfd8d1'%20stroke-width='3'/%3E%3Cline%20x1='70'%20y1='40'%20x2='70'%20y2='300'%20stroke='%23cfd8d1'%20stroke-width='3'/%3E%3Cline%20x1='70'%20y1='150'%20x2='780'%20y2='150'%20stroke='%23284c3e'%20stroke-width='3'%20stroke-dasharray='10%2010'/%3E%3Ctext%20x='790'%20y='155'%20font-size='20'%20fill='%23284c3e'%3EA%3C/text%3E%3Cg%20fill='%233a5d7a'%3E%3Ccircle%20cx='120'%20cy='245'%20r='8'/%3E%3Ccircle%20cx='180'%20cy='210'%20r='8'/%3E%3Ccircle%20cx='240'%20cy='188'%20r='8'/%3E%3Ccircle%20cx='300'%20cy='174'%20r='8'/%3E%3Ccircle%20cx='360'%20cy='165'%20r='8'/%3E%3Ccircle%20cx='420'%20cy='159'%20r='8'/%3E%3Ccircle%20cx='480'%20cy='155'%20r='8'/%3E%3Ccircle%20cx='540'%20cy='153'%20r='8'/%3E%3Ccircle%20cx='600'%20cy='151'%20r='8'/%3E%3C/g%3E%3C/svg%3E | 图 1：数列项逐步靠近水平线 $A$。 | 数列趋近示意图 | wide

@interactive-sine 正弦曲线交互 | 拖动滑块观察振幅和频率如何影响函数图像，为后续函数极限和连续性做准备。

@interactive function | 二次函数参数变化 | 拖动参数，观察开口方向、顶点位置和纵截距如何变化。
expression: a*x*x + b*x + c
a: -5,5,0.1,1
b: -5,5,0.1,0
c: -5,5,0.1,0
xMin: -6
xMax: 6
yMin: -8
yMax: 8

@video 数列极限视频讲解 |  | 这里是视频播放窗口。把第二个字段替换成 mp4 地址、B 站 iframe 地址或其他可嵌入播放地址即可。
