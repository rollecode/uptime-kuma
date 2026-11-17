<template>
    <div>
        <div class="my-3">
            <EmptyState
                v-if="$root.remoteBrowserList.length === 0"
                illustration="magnifier"
                :title="$t('No remote browsers yet')"
            >
                {{ $t("remoteBrowsersDescription") }}
                <template #action>
                    <button class="btn btn-normal" type="button" @click="$refs.remoteBrowserDialog.show()">
                        {{ $t("Add Remote Browser") }}
                    </button>
                </template>
            </EmptyState>
            <template v-else>
                <div
                    v-for="remoteBrowser in $root.remoteBrowserList"
                    :key="remoteBrowser.id"
                    class="carbon-channel carbon-linkrow"
                >
                    <span class="name">{{ remoteBrowser.name }}</span>
                    <button
                        type="button"
                        class="carbon-quiet carbon-linkrow-target"
                        @click="$refs.remoteBrowserDialog.show(remoteBrowser.id)"
                    >
                        {{ $t("Edit") }}
                    </button>
                </div>
                <button class="btn btn-normal" type="button" @click="$refs.remoteBrowserDialog.show()">
                    {{ $t("Add Remote Browser") }}
                </button>
                <p class="carbon-muted mt-4">
                    {{ $t("remoteBrowsersDescription") }}
                    <a href="https://docs.browserless.io/enterprise/open-source">{{ $t("self-hosted container") }}</a>
                </p>
            </template>
        </div>

        <RemoteBrowserDialog ref="remoteBrowserDialog" />
    </div>
</template>

<script>
import RemoteBrowserDialog from "../../components/RemoteBrowserDialog.vue";
import EmptyState from "../../components/EmptyState.vue";

export default {
    components: {
        RemoteBrowserDialog,
        EmptyState,
    },

    data() {
        return {};
    },

    computed: {
        settings() {
            return this.$parent.$parent.settings;
        },
        saveSettings() {
            return this.$parent.$parent.saveSettings;
        },
        settingsLoaded() {
            return this.$parent.$parent.settingsLoaded;
        },
    },
};
</script>
