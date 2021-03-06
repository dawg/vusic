<template>
  <svg 
    class="envelope-visualizer" 
    ref="el"
    :viewBox="viewBox" 
    preserveAspectRatio="xMinYMid slice"
    :height="height"
    :width="width"
    @click="addPoint"
  >
    <path 
      class="envelope-shape primary--stroke" 
      :d="path" 
      fill="transparent"
      stroke-width="2"
    ></path>

    <drag-element
      v-for="(point, i) in processed"
      :key="i"
      tag="circle"
      cursor="pointer"
      @move="move($event, i)"
      @contextmenu.native="pointContext($event, i)"
      v-bind="point"
      :r="radius"
      class="primary--stroke"
      fill="#284554" 
      stroke="#4eccff" 
      stroke-width="2"
    ></drag-element>
    
  </svg>
</template>

<script lang="ts">
import Vue from 'vue';
import { ScheduledAutomation } from '@/models';
import { scale } from '@/lib/std';
import * as dawg from '@/dawg';
import { createComponent, computed, ref } from '@vue/composition-api';
import { doSnap } from '@/utils';
import { getLogger } from '@/lib/log';

const logger = getLogger('AutomationClipElement');

export default createComponent({
  name: 'AutomationClipElement',
  props: {
    pxPerBeat: { type: Number, required: true },
    // FIXME small bug height !== true height
    height: { type: Number, required: true },
    snap: { type: Number, required: true },
    minSnap: { type: Number, required: true },

    radius: { type: Number, default: 4 },
    element: { type: Object as () => ScheduledAutomation, required: true },
  },
  setup(props, context) {
    const el = ref<SVGElement>();

    const clip = computed(() => {
      return props.element.element;
    });

    const points = computed(() => {
      return clip.value.points;
    });

    const minValue = computed(() => {
      return clip.value.minValue;
    });

    const maxValue = computed(() => {
      return clip.value.maxValue;
    });

    const fromRange = computed((): [number, number] => {
      return [minValue.value, maxValue.value];
    });

    const processed = computed(() => {
      return points.value.slice().sort((a, b) => {
        return a.time.value - b.time.value;
      }).map((point) => {
        return {
          cx: point.time.value * props.pxPerBeat,
          cy: (1 - scale(point.value.value, fromRange.value, [0, 1])) * props.height,
        };
      });
    });

    const times = computed(() => {
      return points.value.map(({ time }) => time.value);
    });

    const maxTime = computed(() => {
      return Math.max(...times.value);
    });

    const width = computed(() => {
      return maxTime.value * props.pxPerBeat;
    });

    const viewBox = computed(() => {
      return `0 0 ${width.value} ${props.height}`;
    });

    const path = computed(() => {
      if (processed.value.length < 1) {
        return [];
      }

      const pts =  [
        { letter: 'M', point: processed.value[0] },
        ...processed.value.slice(1).map((point) => ({ letter: 'L', point })),
      ];

      return pts.map(({ letter, point }) => `${letter} ${point.cx} ${point.cy}`).join(' ');
    });

    function getTimeValue(e: MouseEvent) {
      if (!el.value) {
        return {
          time: 0,
          value: 0,
        };
      }

      const rect = el.value.getBoundingClientRect();
      const time = doSnap({
        position: e.clientX,
        altKey: e.altKey,
        snap: props.snap,
        minSnap: props.minSnap,
        offset: rect.left,
        pxPerBeat: props.pxPerBeat,
        scroll: 0,
      });

      const value = (e.clientY - rect.top) / props.height;

      return {
        time,
        value,
      };
    }

    function addPoint(e: MouseEvent) {
      clip.value.add(getTimeValue(e));
    }

    function move(e: MouseEvent, i: number) {
      // We still NEED to put bounds on the returned values as
      // it is possible to move out of bounds
      let { time, value } = getTimeValue(e);

      const lowerBound = i === 0 ? 0 : points.value[i - 1].time.value;
      const upperBound = i === points.value.length - 1 ? Infinity : points.value[i + 1].time.value;
      time = Math.max(lowerBound, Math.min(upperBound, time));

      clip.value.points[i].time.value = time;

      // FIXME this needs a better home
      props.element.duration.value = Math.max(props.element.duration.value, time);

      value = Math.max(0, Math.min(1, value));
      value = 1 - scale(value, [0, 1], fromRange.value);

      logger.debug(`Changing ${clip.value.points[i].value} -> ${value}`);
      clip.value.points[i].value.value = value;
      Vue.set(points.value, i, points.value[i]);
    }

    function deleteClip(i: number) {
      clip.value.points.splice(i, 1);
    }

    function pointContext(event: MouseEvent, i: number) {
      dawg.context({
        position: event,
        items: [
          {
            text: 'Delete',
            callback: () => deleteClip(i),
          },
        ],
      });
    }

    return {
      el,
      viewBox,
      width,
      addPoint,
      path,
      processed,
      move,
      pointContext,
    };
  },
});
</script>

<style lang="sass" scoped>
.envelope-visualizer
  overflow: visible
</style>