<template>
    <div class="carbon-calm" :class="{ 'is-large': large }">
        <img :src="art.src" alt="" />
        <div class="title">{{ title }}</div>
        <div v-if="$slots.default" class="desc"><slot /></div>
        <div v-if="$slots.action" class="action"><slot name="action" /></div>
        <div class="credit">{{ art.credit }}</div>
    </div>
</template>

<script>
import lighthouse from "../assets/carbon/art/lighthouse.webp";
import hourglass from "../assets/carbon/art/hourglass.webp";
import crane from "../assets/carbon/art/crane.webp";
import magnifier from "../assets/carbon/art/magnifier.webp";
import fern from "../assets/carbon/art/fern.webp";
import padlock from "../assets/carbon/art/padlock.webp";
import bridge from "../assets/carbon/art/bridge.webp";
import watch from "../assets/carbon/art/watch.webp";
import semaphore from "../assets/carbon/art/semaphore.webp";
import anchor from "../assets/carbon/art/anchor.webp";
import pigeons from "../assets/carbon/art/pigeons.webp";
import telescope from "../assets/carbon/art/telescope.webp";
import clockwork from "../assets/carbon/art/clockwork.webp";

// Each empty place has its own engraving; see assets/carbon/art/CREDITS.md
const ART = {
    lighthouse: { src: lighthouse, credit: "Farne Islands lighthouse, British Library, CC0" },
    hourglass: { src: hourglass, credit: "Egg timer, British Library, CC0" },
    crane: { src: crane, credit: "Moveable crane at Ramsgate, wood engraving, CC0" },
    magnifier: { src: magnifier, credit: "Magnifying glass, British Library, CC0" },
    fern: { src: fern, credit: "Fern specimens, CC0" },
    padlock: { src: padlock, credit: "Russian padlock and key, wood engraving, CC0" },
    bridge: { src: bridge, credit: "Suspension bridge, engraving c. 1861, CC0" },
    watch: { src: watch, credit: "Antique time piece, British Library, CC0" },
    semaphore: { src: semaphore, credit: "Coast telegraph at Scheveningen, 1799, CC0" },
    anchor: { src: anchor, credit: "Anchor, British Library, CC0" },
    pigeons: { src: pigeons, credit: "Pigeon messengers, Harper's, public domain" },
    telescope: { src: telescope, credit: "Early telescope, engraving, CC0" },
    clockwork: { src: clockwork, credit: "Clock mechanism, engraving, CC0" },
};

/**
 * What a list or page shows when it has nothing in it yet
 */
export default {
    props: {
        /** Which illustration to show */
        illustration: {
            type: String,
            required: true,
        },
        /** Bigger illustration, for a page's main empty state */
        large: {
            type: Boolean,
            default: false,
        },
        /** One short title in plain words */
        title: {
            type: String,
            required: true,
        },
    },
    computed: {
        art() {
            return ART[this.illustration];
        },
    },
};
</script>
