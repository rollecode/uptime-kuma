<template>
    <div class="carbon carbon-login" :class="$root.theme">
        <div class="carbon-login-form">
            <router-link to="/" class="carbon-login-brand">
                <img src="/icon.svg" width="22" height="22" alt="" />
                Uptime Kuma
            </router-link>
            <h1>{{ $t("Page not found") }}</h1>
            <p class="carbon-muted">{{ $t("notFoundHelp") }}</p>
            <div class="d-flex gap-2 mt-3">
                <a href="/" class="btn btn-primary">{{ $t("Go to the dashboard") }}</a>
                <button type="button" class="btn btn-normal" @click="goBack()">{{ $t("Go back") }}</button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    async mounted() {},
    methods: {
        /**
         * Go back 1 in browser history
         * @returns {void}
         */
        goBack() {
            history.back();
        },
    },
};
</script>
