<script setup>
defineProps({ name: String, size: { type: Number, default: 20 } })

const paths = {
  code: 'M8 4H6v6l-3 2 3 2v6h2 M16 4h2v6l3 2-3 2v6h-2',
  compare: 'M3 7h16 M15 3l4 4-4 4 M21 17H5 M9 13l-4 4 4 4',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  accounts:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  search: 'M21 21l-4.4-4.4 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  refresh:
    'M20 7v5h-5 M4 17v-5h5 M6.1 6.1A8 8 0 0 1 19.5 9 M4.5 15a8 8 0 0 0 13.4 2.9',
  copy: 'M9 9h12v12H9z M15 5V3H3v12h2',
  arrow: 'M7 17 17 7 M7 7h10v10',
  chevron: 'm9 5 7 7-7 7',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12 M6 18 18 6',
  box: 'm12 3 9 5-9 5-9-5 9-5 M3 8v9l9 5 9-5V8 M12 13v9',
  flask: 'M9 3h6 M10 3v7l-6 9a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3 M8 15h8',
  alert:
    'M12 8v5 M12 17h.01 M10.3 3.9 1.8 18.5A1.7 1.7 0 0 0 3.3 21h17.4a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a2 2 0 0 0-3.4 0',
}
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.grid" />
  </svg>
</template>
