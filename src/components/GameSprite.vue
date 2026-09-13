<script setup>
defineProps({ name: { type: String, required: true }, complete: Boolean })
</script>

<template>
  <svg class="game-sprite" :class="`sprite-${name}`" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    <g v-if="name === 'worker'" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="32" cy="59" rx="21" ry="4" fill="#274d3d" opacity=".14" />
      <path d="M23 47v10h-8c-1-6 3-9 8-10ZM41 47v10h8c1-6-3-9-8-10Z" fill="#304942" stroke="#263e38" stroke-width="2" />
      <path d="M21 34c-6 2-9 7-10 13l7 3 7-11M43 34c6 2 9 7 10 13l-7 3-7-11" fill="#f4c474" stroke="#b78645" stroke-width="2" />
      <circle cx="14" cy="48" r="4" fill="#f5cfaa" /><circle cx="50" cy="48" r="4" fill="#f5cfaa" />
      <path d="M22 33h20l4 21c-8 4-20 4-28 0Z" fill="#3b8c77" stroke="#286856" stroke-width="2" />
      <path d="M24 33v10h16V33" stroke="#9bd0b2" stroke-width="4" />
      <rect x="27" y="44" width="10" height="8" rx="2" fill="#286856" />
      <circle cx="24" cy="41" r="1.5" fill="#f9d990" /><circle cx="40" cy="41" r="1.5" fill="#f9d990" />
      <circle cx="18" cy="24" r="4" fill="#e7b489" /><circle cx="46" cy="24" r="4" fill="#e7b489" />
      <rect x="19" y="11" width="26" height="25" rx="11" fill="#f7d5b2" stroke="#bd8c66" stroke-width="1.5" />
      <path d="M20 21v-6h24v6l-5-5H25Z" fill="#685044" />
      <circle cx="27" cy="24" r="1.6" fill="#3d4943" /><circle cx="37" cy="24" r="1.6" fill="#3d4943" />
      <path d="M29 29q3 3 6 0" stroke="#ad715b" stroke-width="1.8" />
      <path d="M17 17C17 7 23 3 32 3s15 4 15 14" fill="#eeb45d" stroke="#b58440" stroke-width="2" />
      <path d="M28 5v9" stroke="#ffe0a0" stroke-width="4" />
      <path d="M16 17h33" stroke="#c78e42" stroke-width="5" />
      <path d="M18 15h28" stroke="#ffdb93" stroke-width="2" />
    </g>
    <g v-else-if="name === 'crate'" stroke-linejoin="round">
      <ellipse cx="33" cy="59" rx="26" ry="3" fill="#564124" opacity=".15" />
      <path d="m7 14 7-8h43l-7 8Z" :fill="complete ? '#b7d8b4' : '#edca8d'" />
      <path d="m50 14 7-8v43l-7 9Z" :fill="complete ? '#507d61' : '#a46b38'" />
      <rect x="7" y="14" width="43" height="44" rx="2" :fill="complete ? '#83b08a' : '#cd9757'" :stroke="complete ? '#4c795b' : '#976031'" stroke-width="2" />
      <path d="M12 28h33M12 43h33M28 18v36" :stroke="complete ? '#628f6a' : '#ae7740'" stroke-width="2" />
      <path d="M13 22h9m11 13h10M15 49h7" :stroke="complete ? '#a6cba6' : '#e5b675'" stroke-width="1.5" stroke-linecap="round" />
      <path d="m11 18 35 35-5 4-34-35Z" :fill="complete ? '#b7d8b4' : '#edc484'" :stroke="complete ? '#628f6a' : '#ad763b'" stroke-width="1.5" />
      <path d="M10 17h37v38H10Z" :stroke="complete ? '#b7d8b4' : '#efca8e'" stroke-width="5" />
      <path d="M10 17h37v38" :stroke="complete ? '#d3e7c9' : '#ffe0a4'" stroke-width="1.5" />
      <g :fill="complete ? '#507d61' : '#976031'"><circle cx="12" cy="20" r="1.3" /><circle cx="44" cy="20" r="1.3" /><circle cx="12" cy="52" r="1.3" /><circle cx="44" cy="52" r="1.3" /></g>
      <g v-if="complete"><circle cx="49" cy="13" r="10" fill="#23765a" stroke="#eff7e9" stroke-width="2" /><path d="m44 13 3 3 6-6" stroke="#fff" stroke-width="2.5" stroke-linecap="round" /></g>
    </g>
    <g v-else-if="name === 'flag'" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="31" cy="57" rx="20" ry="4" fill="#274d3d" opacity=".13" />
      <path d="M27 46 14 55h33l-13-9Z" fill="#7d9988" />
      <path d="M28 9c10-6 16 7 28 1v24c-12 6-18-7-28-1Z" fill="#d9715d" stroke="#af5345" stroke-width="2" />
      <path d="M31 12c8-2 13 6 22 3" stroke="#f3ac8d" stroke-width="3" />
      <path d="M27 8v44" stroke="#35584b" stroke-width="4" />
      <path d="M26 11v38" stroke="#6e9280" stroke-width="1.5" />
      <circle cx="27" cy="7" r="3.5" fill="#e0b66b" />
      <path d="M21 54h21" stroke="#aec3ad" stroke-width="2" />
    </g>
    <g v-else-if="name === 'mine'" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="32" cy="57" rx="23" ry="4" fill="#263e38" opacity=".14" />
      <path d="M32 6v10m0 32v10M6 32h10m32 0h10M13 13l8 8m22 22 8 8M13 51l8-8m22-22 8-8" stroke="#455e57" stroke-width="5" />
      <circle cx="32" cy="32" r="20" fill="#3b514c" stroke="#263e38" stroke-width="2" />
      <path d="M48 30c0 14-13 21-25 14 10 2 22-5 25-14" fill="#293f39" />
      <path d="M20 27c1-6 6-10 12-10" stroke="#90aaa0" stroke-width="4" />
      <circle cx="38" cy="24" r="3" fill="#c78f70" /><circle cx="37" cy="23" r="1" fill="#f3d9b5" />
    </g>
  </svg>
</template>

<style scoped>
.game-sprite { display: block; width: 100%; height: 100%; pointer-events: none; }
</style>
