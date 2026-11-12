<script setup>
import { computed } from 'vue';

// Renderiza o corpo do e-mail simulado sem v-html: parágrafos separados por linha em branco,
// **texto** em negrito e a linha {link} como link ilustrativo (que nunca navega).
const props = defineProps({ body: { type: String, required: true }, linkLabel: { type: String, default: null } });

const paragraphs = computed(() =>
  props.body.split(/\n{2,}/).map((p) => {
    if (p.trim() === '{link}') return { link: true };
    return {
      lines: p.split('\n').map((line) =>
        line.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part) =>
          part.startsWith('**') && part.endsWith('**') ? { bold: true, text: part.slice(2, -2) } : { text: part }
        )
      )
    };
  })
);
</script>

<template>
  <div class="email-content">
    <template v-for="(p, i) in paragraphs" :key="i">
      <p v-if="p.link && linkLabel"><a href="#" class="fake-link" @click.prevent>{{ linkLabel }}</a></p>
      <p v-else-if="!p.link">
        <template v-for="(line, j) in p.lines" :key="j">
          <br v-if="j > 0" />
          <template v-for="(part, k) in line" :key="k">
            <strong v-if="part.bold">{{ part.text }}</strong><template v-else>{{ part.text }}</template>
          </template>
        </template>
      </p>
    </template>
  </div>
</template>
