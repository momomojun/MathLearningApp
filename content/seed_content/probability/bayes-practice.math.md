@chapter A | 概率统计题组
@section A.1 | 贝叶斯公式
@subsection A.1.1 | 后验概率

@problem 训练 1 | 综合题 | 中等 | 贝叶斯公式,后验概率 | 应用题
某检测方法对患者的阳性率为 $0.95$，对非患者的假阳性率为 $0.05$。若患病率为 $0.01$，求检测为阳性时确实患病的概率。

@solution 解析
设 $D$ 表示患病，$+$ 表示检测阳性。由贝叶斯公式：
$$
P(D\mid +)=\frac{P(D)P(+\mid D)}{P(D)P(+\mid D)+P(D^c)P(+\mid D^c)}.
$$
代入得到
$$
\frac{0.01\times0.95}{0.01\times0.95+0.99\times0.05}\approx0.161.
$$
