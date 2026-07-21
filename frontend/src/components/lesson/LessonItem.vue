<script setup>
import FunctionExplorer from '../interactive/FunctionExplorer.vue'
import InteractiveEmbed from '../interactive/InteractiveEmbed.vue'
import InteractiveSine from '../interactive/InteractiveSine.vue'
import CodeBlock from './CodeBlock.vue'
import FigureBlock from './FigureBlock.vue'
import InteractivePlaceholder from './InteractivePlaceholder.vue'
import ProblemBlock from './ProblemBlock.vue'
import StatementBlock from './StatementBlock.vue'
import TableBlock from './TableBlock.vue'
import TextBlock from './TextBlock.vue'
import VideoBlock from './VideoBlock.vue'

defineProps({
  item: {
    type: Object,
    required: true,
  },
  status: {
    type: Object,
    default: null,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  inWrongBook: {
    type: Boolean,
    default: false,
  },
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle', 'mark-done', 'mark-wrong', 'toggle-favorite', 'toggle-wrong-book'])

const statementKinds = ['def', 'theorem', 'corollary', 'proposition']
</script>

<template>
  <TextBlock v-if="item.kind === 'text'" :item="item" />
  <ProblemBlock
    v-else-if="item.kind === 'problem'"
    :item="item"
    :status="status"
    :is-favorite="isFavorite"
    :in-wrong-book="inWrongBook"
    :is-open="isOpen"
    @toggle="emit('toggle', $event)"
    @mark-done="emit('mark-done', $event)"
    @mark-wrong="emit('mark-wrong', $event)"
    @toggle-favorite="emit('toggle-favorite', $event)"
    @toggle-wrong-book="emit('toggle-wrong-book', $event)"
  />
  <StatementBlock
    v-else-if="statementKinds.includes(item.kind)"
    :item="item"
    :is-open="isOpen"
    @toggle="emit('toggle', $event)"
  />
  <FigureBlock v-else-if="item.kind === 'figure'" :item="item" />
  <TableBlock v-else-if="item.kind === 'table'" :item="item" />
  <CodeBlock v-else-if="item.kind === 'code'" :item="item" />
  <InteractiveSine
    v-else-if="item.kind === 'interactive-sine'"
    :title="item.title"
    :desc="item.desc"
  />
  <FunctionExplorer v-else-if="item.kind === 'interactive-function'" :item="item" />
  <InteractiveEmbed v-else-if="item.kind === 'interactive-embed'" :item="item" />
  <InteractivePlaceholder v-else-if="item.kind === 'interactive'" :item="item" />
  <VideoBlock v-else-if="item.kind === 'video'" :item="item" />
</template>
