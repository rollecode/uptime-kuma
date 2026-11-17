<template>
    <div>
        <div class="my-3">
            <EmptyState
                v-if="$root.dockerHostList.length === 0"
                illustration="crane"
                :title="$t('No Docker hosts yet')"
            >
                {{ $t("dockerHostsEmptyHelp") }}
                <template #action>
                    <button class="btn btn-normal" type="button" @click="$refs.dockerHostDialog.show()">
                        {{ $t("Setup Docker Host") }}
                    </button>
                </template>
            </EmptyState>
            <template v-else>
                <div
                    v-for="dockerHost in $root.dockerHostList"
                    :key="dockerHost.id"
                    class="carbon-channel carbon-linkrow"
                >
                    <span class="name">{{ dockerHost.name }}</span>
                    <span class="type carbon-mono">{{ dockerHost.dockerDaemon }}</span>
                    <button
                        type="button"
                        class="carbon-quiet carbon-linkrow-target"
                        @click="$refs.dockerHostDialog.show(dockerHost.id)"
                    >
                        {{ $t("Edit") }}
                    </button>
                </div>
                <button class="btn btn-normal" type="button" @click="$refs.dockerHostDialog.show()">
                    {{ $t("Setup Docker Host") }}
                </button>
            </template>
        </div>

        <DockerHostDialog ref="dockerHostDialog" />
    </div>
</template>

<script>
import DockerHostDialog from "../../components/DockerHostDialog.vue";
import EmptyState from "../../components/EmptyState.vue";

export default {
    components: {
        DockerHostDialog,
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
