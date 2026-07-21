<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const width = 720
const height = 360
const reservedKeys = new Set(['expression', 'xMin', 'xMax', 'yMin', 'yMax', 'samples'])
const mathContext = {
  abs: Math.abs,
  acos: Math.acos,
  asin: Math.asin,
  atan: Math.atan,
  cos: Math.cos,
  e: Math.E,
  exp: Math.exp,
  log: Math.log,
  max: Math.max,
  min: Math.min,
  pi: Math.PI,
  pow: Math.pow,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan,
}

const values = reactive({})
const config = computed(() => props.item.config || {})
const expression = computed(() => normalizeExpression(config.value.expression || 'a*x*x + b*x + c'))
const xMin = computed(() => numberConfig('xMin', -8))
const xMax = computed(() => numberConfig('xMax', 8))
const yMin = computed(() => numberConfig('yMin', -8))
const yMax = computed(() => numberConfig('yMax', 8))
const samples = computed(() => Math.max(40, Math.min(500, numberConfig('samples', 240))))

const params = computed(() => {
  const parsed = Object.entries(config.value)
    .filter(([name]) => !reservedKeys.has(name))
    .map(([name, raw]) => parseParam(name, raw))
    .filter(Boolean)

  return parsed.length
    ? parsed.slice(0, 6)
    : [
        { name: 'a', min: -5, max: 5, step: 0.1, value: 1 },
        { name: 'b', min: -5, max: 5, step: 0.1, value: 0 },
        { name: 'c', min: -5, max: 5, step: 0.1, value: 0 },
      ]
})

watch(
  params,
  (nextParams) => {
    const names = new Set(nextParams.map((param) => param.name))
    Object.keys(values).forEach((name) => {
      if (!names.has(name)) delete values[name]
    })
    nextParams.forEach((param) => {
      if (values[param.name] === undefined) values[param.name] = param.value
      if (values[param.name] < param.min || values[param.name] > param.max) {
        values[param.name] = param.value
      }
    })
  },
  { immediate: true },
)

const xTicks = computed(() => makeTicks(xMin.value, xMax.value, 8))
const yTicks = computed(() => makeTicks(yMin.value, yMax.value, 8))
const axisX = computed(() => (yMin.value <= 0 && yMax.value >= 0 ? toSvgY(0) : null))
const axisY = computed(() => (xMin.value <= 0 && xMax.value >= 0 ? toSvgX(0) : null))

const plot = computed(() => {
  try {
    const paramNames = params.value.map((param) => param.name)
    const fn = compileExpression(expression.value, paramNames)
    const paramValues = paramNames.map((name) => Number(values[name]) || 0)
    const contextValues = Object.values(mathContext)
    const xRange = xMax.value - xMin.value
    const yRange = yMax.value - yMin.value
    let d = ''
    let penUp = true

    for (let index = 0; index <= samples.value; index += 1) {
      const x = xMin.value + (xRange * index) / samples.value
      const y = fn(x, ...paramValues, ...contextValues)
      const visible = Number.isFinite(y) && y >= yMin.value - yRange * 2 && y <= yMax.value + yRange * 2

      if (!visible) {
        penUp = true
        continue
      }

      const px = toSvgX(x).toFixed(2)
      const py = toSvgY(y).toFixed(2)
      d += `${penUp ? 'M' : 'L'}${px} ${py} `
      penUp = false
    }

    return { d: d.trim(), error: '' }
  } catch (err) {
    return { d: '', error: err.message || '表达式无法解析' }
  }
})

const formula = computed(() => `y = ${expression.value}`)

function numberConfig(name, fallback) {
  const value = Number(config.value[name])
  return Number.isFinite(value) ? value : fallback
}

function parseParam(name, raw) {
  if (!/^[a-zA-Z_]\w*$/.test(name)) return null
  const [min, max, step, value] = String(raw || '')
    .split(/[,，]/)
    .map((part) => Number(part.trim()))

  if (![min, max].every(Number.isFinite) || min >= max) return null

  return {
    name,
    min,
    max,
    step: Number.isFinite(step) && step > 0 ? step : 0.1,
    value: Number.isFinite(value) ? value : min,
  }
}

function normalizeExpression(raw) {
  return String(raw || '')
    .replace(/π/g, 'pi')
    .replace(/\^/g, '**')
    .trim()
}

function compileExpression(source, paramNames) {
  if (!source) throw new Error('请填写 expression')
  if (/[^0-9+\-*/%().,\sA-Za-z_]/.test(source)) {
    throw new Error('表达式只支持数字、变量、四则运算和常用函数')
  }

  const allowed = new Set(['x', ...paramNames, ...Object.keys(mathContext)])
  const identifiers = source.match(/[A-Za-z_]\w*/g) || []
  const unknown = identifiers.find((name) => !allowed.has(name))
  if (unknown) throw new Error(`未知变量或函数：${unknown}`)

  return new Function(
    'x',
    ...paramNames,
    ...Object.keys(mathContext),
    `"use strict"; return (${source});`,
  )
}

function makeTicks(min, max, count) {
  const step = (max - min) / count
  return Array.from({ length: count + 1 }, (_, index) => Number((min + step * index).toFixed(2)))
}

function toSvgX(x) {
  return ((x - xMin.value) / (xMax.value - xMin.value)) * width
}

function toSvgY(y) {
  return height - ((y - yMin.value) / (yMax.value - yMin.value)) * height
}
</script>

<template>
  <article class="ix function-ix">
    <div class="ix-head">
      <span class="ix-badge">函数</span>
      <span class="ix-title">{{ item.title || '函数图像交互' }}</span>
    </div>
    <div class="ix-body">
      <p v-if="item.desc" class="ix-desc">{{ item.desc }}</p>
      <div class="function-canvas-wrap">
        <svg class="ix-canvas function-canvas" viewBox="0 0 720 360" role="img" :aria-label="formula">
          <line
            v-for="tick in xTicks"
            :key="`x-${tick}`"
            :x1="toSvgX(tick)"
            y1="0"
            :x2="toSvgX(tick)"
            :y2="height"
            class="grid-line"
          />
          <line
            v-for="tick in yTicks"
            :key="`y-${tick}`"
            x1="0"
            :y1="toSvgY(tick)"
            :x2="width"
            :y2="toSvgY(tick)"
            class="grid-line"
          />
          <line v-if="axisX !== null" x1="0" :y1="axisX" :x2="width" :y2="axisX" class="axis-line" />
          <line v-if="axisY !== null" :x1="axisY" y1="0" :x2="axisY" :y2="height" class="axis-line" />
          <path v-if="plot.d" :d="plot.d" class="function-path" />
        </svg>
        <div class="function-formula">{{ formula }}</div>
        <p v-if="plot.error" class="function-error">{{ plot.error }}</p>
      </div>

      <div class="ix-controls function-controls">
        <label v-for="param in params" :key="param.name">
          <span class="row">
            <span>{{ param.name }}</span>
            <span class="val">{{ Number(values[param.name]).toFixed(2) }}</span>
          </span>
          <input
            v-model.number="values[param.name]"
            type="range"
            :min="param.min"
            :max="param.max"
            :step="param.step"
          >
        </label>
      </div>
    </div>
  </article>
</template>
