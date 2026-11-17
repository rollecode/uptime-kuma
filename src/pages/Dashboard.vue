<template>
    <div ref="container">
        <!-- Add :key to disable vue router re-use the same component -->
        <router-view :key="$route.fullPath" :calculatedHeight="height" />
    </div>
</template>

<script>
export default {
    data() {
        return {
            height: 0,
        };
    },
    mounted() {
        this.height = this.$refs.container.offsetHeight;
    },
};
</script>
