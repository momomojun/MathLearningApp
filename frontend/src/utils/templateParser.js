function splitBar(text) {
  const index = text.indexOf('|')
  return index < 0 ? [text.trim(), ''] : [text.slice(0, index).trim(), text.slice(index + 1).trim()]
}

function splitFields(text) {
  return String(text || '')
    .split('|')
    .map((field) => field.trim())
}

function parseListField(text) {
  return String(text || '')
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseConfigBlock(text) {
  const config = {}
  String(text || '')
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^([a-zA-Z][\w-]*)\s*:\s*(.*?)\s*$/)
      if (match) config[match[1]] = match[2]
    })
  return config
}

function commandFrom(line) {
  const match = line.match(/^@([a-z-]+)\s*(.*)$/i)
  if (!match) return null
  return { name: match[1].toLowerCase(), args: match[2] || '' }
}

export function parseTemplate(source, fallbackTitle = '未命名内容') {
  const normalizedSource = String(source || '')
  const page = {
    chapter: null,
    section: { id: 'lesson-section', num: '', title: fallbackTitle },
    subsections: [],
  }

  let currentSub = null
  let currentItem = null
  let currentField = null
  let lastItem = null
  let id = 0

  const nextId = (prefix) => `${prefix}-${++id}`
  const ensureSub = () => {
    if (!currentSub) {
      currentSub = { id: nextId('sub'), num: '', title: '正文', items: [] }
      page.subsections.push(currentSub)
    }
    return currentSub
  }
  const finishField = () => {
    if (currentItem && currentField) {
      currentItem[currentField] = trimBlank(currentItem[currentField] || '')
    }
    currentItem = null
    currentField = null
  }
  const addItem = (item, field = 'body') => {
    finishField()
    ensureSub().items.push(item)
    currentItem = item
    currentField = field
    lastItem = item
  }

  normalizedSource.split(/\r?\n/).forEach((line) => {
    const command = commandFrom(line)
    if (!command) {
      if (currentItem && currentField) {
        currentItem[currentField] = `${currentItem[currentField] || ''}${line}\n`
      }
      return
    }

    finishField()

    if (command.name === 'chapter') {
      const [num, title] = splitBar(command.args)
      page.chapter = { num, title }
      return
    }

    if (command.name === 'section') {
      const [num, title] = splitBar(command.args)
      page.section = { id: nextId('section'), num, title: title || fallbackTitle }
      return
    }

    if (command.name === 'subsection') {
      const [num, title] = splitBar(command.args)
      currentSub = { id: nextId('sub'), num, title, items: [] }
      page.subsections.push(currentSub)
      return
    }

    if (command.name === 'solution') {
      if (lastItem) {
        currentItem = lastItem
        currentItem.solutionLabel = command.args.trim() || defaultSolutionLabel(lastItem.kind)
        currentItem.solution = ''
        currentField = 'solution'
      }
      return
    }

    if (command.name === 'image' || command.name === 'figure') {
      const [title, src, caption, alt, width] = splitFields(command.args)
      ensureSub().items.push({
        id: nextId('figure'),
        kind: 'figure',
        title,
        src,
        caption,
        alt,
        width: width || 'wide',
      })
      return
    }

    if (command.name === 'interactive-sine') {
      const [title, desc] = splitBar(command.args)
      ensureSub().items.push({ id: nextId('ix'), kind: 'interactive-sine', title, desc })
      return
    }

    if (command.name === 'interactive') {
      const [first, second, third] = splitFields(command.args)
      const type = String(first || '').toLowerCase()
      const knownTypes = ['sine', 'function', 'geogebra', 'desmos']

      if (knownTypes.includes(type)) {
        const kind = type === 'sine'
          ? 'interactive-sine'
          : type === 'function'
            ? 'interactive-function'
            : 'interactive-embed'

        addItem({
          id: nextId('ix'),
          kind,
          interactiveType: type,
          title: second || defaultInteractiveTitle(type),
          desc: third || '',
          body: '',
        })
        return
      }

      const [title, desc] = splitBar(command.args)
      addItem({ id: nextId('ix'), kind: 'interactive', title, desc, body: '' })
      return
    }

    if (command.name === 'video') {
      const [title, src, desc, poster, previewOrAccess, accessField] = splitFields(command.args)
      const previewIsAccess = ['member', 'free'].includes(String(previewOrAccess || '').toLowerCase())
      ensureSub().items.push({
        id: nextId('video'),
        kind: 'video',
        title,
        src,
        desc,
        poster,
        previewSeconds: previewIsAccess ? 0 : Number(previewOrAccess) || 0,
        access: previewIsAccess
          ? previewOrAccess.toLowerCase()
          : String(accessField || '').toLowerCase(),
      })
      return
    }

    const blockKinds = ['def', 'theorem', 'corollary', 'proposition']
    if (blockKinds.includes(command.name)) {
      const [num, title] = splitBar(command.args)
      addItem({ id: nextId(command.name), kind: command.name, num, title, body: '' })
      return
    }

    if (command.name === 'problem') {
      const [title, type, difficulty, knowledge, tags] = splitFields(command.args)
      addItem({
        id: nextId('problem'),
        kind: 'problem',
        title: title || '训练',
        problemType: type || '计算题',
        difficulty: difficulty || '基础',
        knowledge: parseListField(knowledge),
        tags: parseListField(tags),
        body: '',
      })
      return
    }

    if (command.name === 'table') {
      const [title, desc] = splitBar(command.args)
      addItem({ id: nextId('table'), kind: 'table', title, desc, body: '' })
      return
    }

    if (command.name === 'code') {
      const [title, lang, desc] = splitFields(command.args)
      addItem({ id: nextId('code'), kind: 'code', title, lang, desc, body: '' })
      return
    }

    if (command.name === 'text' || command.name === 'markdown') {
      addItem({ id: nextId('text'), kind: 'text', title: command.args.trim(), body: '' })
    }
  })

  finishField()
  page.subsections.forEach((sub) => {
    sub.items.forEach((item) => {
      if (item.body && item.kind.startsWith('interactive')) {
        item.config = parseConfigBlock(item.body)
      }
    })
  })

  if (!page.subsections.length) {
    page.subsections.push({
      id: nextId('sub'),
      num: '',
      title: '正文',
      items: [{ id: nextId('text'), kind: 'text', title: '', body: normalizedSource }],
    })
  }

  return page
}

export function trimBlank(text) {
  return String(text || '').replace(/^\n+/, '').replace(/\n+$/, '')
}

function defaultSolutionLabel(kind) {
  return kind === 'theorem' || kind === 'corollary' || kind === 'proposition' ? '证明' : '解析'
}

function defaultInteractiveTitle(type) {
  const titles = {
    sine: '正弦曲线交互',
    function: '函数图像交互',
    geogebra: 'GeoGebra 几何演示',
    desmos: 'Desmos 函数图像',
  }
  return titles[type] || '交互模块'
}
