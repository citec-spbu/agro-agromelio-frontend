<template>
  <q-item clickable tag="a" :to="link" :class="{ 'menu-active': isActive }" class="menu-item" @click="action" v-if="!hide">
    <q-item-section v-if="icon" avatar>
      <div class="menu-icon-wrap">
        <q-icon :name="icon" class="menu-icon" />
      </div>
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ title }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { useRoute } from 'vue-router'

export default defineComponent({
  name: 'EssentialLink',
  props: {
    title: {
      type: String,
      required: true
    },
    link: {
      type: String,
      default: '#'
    },
    icon: {
      type: String,
      default: ''
    },
    action: {
      type: Function,
      default: () => { }
    },
    hide: {
      type: Boolean,
      default: false,
    }
  },

  setup(props) {
    const route = useRoute()
    const isActive = computed(() => route.fullPath === props.link)



    return {
      isActive
    }
  }
})
</script>


<style scoped>
.menu-item {
  font-size: 17px;
  border-radius: 12px;
  margin: 6px 10px;
  min-height: 48px;
  transition: all 0.22s ease;
  position: relative;
  overflow: hidden;
}

.menu-item:hover {
  background-color: rgba(255, 255, 255, 0.11);
  transform: translateX(3px);
}

.menu-active {
  background: linear-gradient(90deg, rgba(94, 167, 253, 0.24), rgba(94, 167, 253, 0.1));
  color: #fff;
  box-shadow: 0 8px 18px rgba(9, 26, 53, 0.18);
  animation: activeGlow 0.28s ease;
}

.menu-active::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 8px;
  bottom: 8px;
  width: 4px;
  border-radius: 3px;
  background-color: #5EA7FD;
  box-shadow: 0 0 10px rgba(94, 167, 253, 0.65);
}

.menu-icon-wrap {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.1);
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.menu-icon {
  font-size: 18px;
}

.menu-item:hover .menu-icon-wrap {
  transform: scale(1.04);
  background: rgba(255, 255, 255, 0.16);
}

@keyframes activeGlow {
  from {
    box-shadow: 0 0 0 rgba(9, 26, 53, 0);
  }
  to {
    box-shadow: 0 8px 18px rgba(9, 26, 53, 0.18);
  }
}

</style>
