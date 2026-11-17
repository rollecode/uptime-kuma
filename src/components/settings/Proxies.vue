<template>
    <div>
        <div class="my-3">
            <EmptyState v-if="$root.proxyList.length === 0" illustration="bridge" :title="$t('No proxies yet')">
                {{ $t("proxyDescription") }}
                <template #action>
                    <button class="btn btn-normal" type="button" @click="$refs.proxyDialog.show()">
                        {{ $t("Setup Proxy") }}
                    </button>
                </template>
            </EmptyState>
            <template v-else>
                <p class="carbon-muted">{{ $t("proxyDescription") }}</p>
                <div v-for="proxy in $root.proxyList" :key="proxy.id" class="carbon-channel carbon-linkrow">
                    <span class="name carbon-mono">{{ proxy.host }}:{{ proxy.port }}</span>
                    <span class="type">{{ proxy.protocol }}</span>
                    <span v-if="proxy.default === true" class="carbon-tag">{{ $t("Default") }}</span>
                    <button type="button" class="carbon-quiet" @click="$refs.proxyDialog.showClone(proxy.id)">
                        {{ $t("Clone") }}
                    </button>
                    <button
                        type="button"
                        class="carbon-quiet carbon-linkrow-target"
                        @click="$refs.proxyDialog.show(proxy.id)"
                    >
                        {{ $t("Edit") }}
                    </button>
                </div>
                <button class="btn btn-normal" type="button" @click="$refs.proxyDialog.show()">
                    {{ $t("Setup Proxy") }}
                </button>
            </template>
        </div>

        <ProxyDialog ref="proxyDialog" />
    </div>
</template>

<script>
import ProxyDialog from "../../components/ProxyDialog.vue";
import EmptyState from "../../components/EmptyState.vue";

export default {
    components: {
        ProxyDialog,
        EmptyState,
    },
};
</script>
