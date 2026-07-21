<script setup>
import { trimBlank } from '../../utils/templateParser'

defineProps({
  item: {
    type: Object,
    required: true,
  },
})

function tableRows(raw) {
  return trimBlank(raw)
    .split('\n')
    .filter((line) => line.trim())
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim()),
    )
    .filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)))
}
</script>

<template>
  <article class="module">
    <div class="module-head">
      <span class="module-badge">表格</span>
      <span class="module-title">{{ item.title }}</span>
    </div>
    <div class="module-body">
      <p v-if="item.desc" class="module-desc">{{ item.desc }}</p>
      <div class="table-wrap">
        <table>
          <thead v-if="tableRows(item.body).length">
            <tr>
              <th v-for="cell in tableRows(item.body)[0]" :key="cell">{{ cell }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in tableRows(item.body).slice(1)" :key="rowIndex">
              <td v-for="cell in row" :key="cell">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </article>
</template>
