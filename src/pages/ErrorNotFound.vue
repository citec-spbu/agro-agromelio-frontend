<template>
  <div class="fullscreen notfound text-center q-pa-md flex flex-center">
    <div>
      <div class="code404">
        404
      </div>

      <div class="text-h2 subtitle">
        Oops. Nothing here...
      </div>

      <q-btn
        class="q-mt-xl"
        color="primary"
        text-color="white"
        unelevated
        to="/"
        label="Go Home"
        no-caps
      />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ErrorNotFound'
})
</script>

<style scoped>
.notfound {
  background: radial-gradient(circle at top, #6ea8ff 0%, #2c4f9e 48%, #1c2d55 100%);
  color: #fff;
}

.code404 {
  font-size: clamp(120px, 24vw, 280px);
  font-weight: 800;
  line-height: 1;
}

.subtitle {
  opacity: 0.72;
}
</style>
