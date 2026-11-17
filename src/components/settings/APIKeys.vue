<template>
    <div>
        <div v-if="settings.disableAuth" class="mt-5 d-flex align-items-center justify-content-center my-3">
            {{ $t("apiKeysDisabledMsg") }}
        </div>
        <div v-else class="my-3">
            <EmptyState v-if="apiKeyList.length === 0" illustration="padlock" :title="$t('No API keys yet')">
                {{ $t("apiKeysEmptyHelp") }}
                <template #action>
                    <button class="btn btn-normal" type="button" @click="$refs.apiKeyDialog.show()">
                        {{ $t("Add API Key") }}
                    </button>
                </template>
            </EmptyState>
            <template v-else>
                <div v-for="(item, index) in apiKeyList" :key="index" class="carbon-event">
                    <span class="carbon-dot" :class="item.enabled ? 'up' : 'wait'" aria-hidden="true"><i /></span>
                    <span class="text">
                        {{ item.name }}
                        <span class="sub">
                            {{ item.enabled ? $t("apiKey-active") : $t("apiKey-inactive") }} ·
                            {{ $t("createdAt", { date: item.createdAt }) }} · {{ $t("Expires") }}:
                            {{ item.expiresAt || $t("Never") }}
                        </span>
                    </span>
                    <span class="when">
                        <button type="button" class="carbon-quiet" @click="deleteDialog(item.id)">
                            {{ $t("Delete") }}
                        </button>
                    </span>
                </div>
                <button class="btn btn-normal mt-3" type="button" @click="$refs.apiKeyDialog.show()">
                    {{ $t("Add API Key") }}
                </button>
            </template>
        </div>

        <a
            class="carbon-quiet d-inline-block mt-4"
            href="https://github.com/louislam/uptime-kuma/wiki/Prometheus-API-Keys"
            target="_blank"
        >
            {{ $t("Learn More") }}
        </a>

        <Confirm ref="confirmDelete" btn-style="btn-danger" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="deleteKey">
            {{ $t("deleteAPIKeyMsg") }}
        </Confirm>

        <APIKeyDialog ref="apiKeyDialog" @keyAdded="loadAPIKeys" />
    </div>
</template>

<script>
import APIKeyDialog from "../../components/APIKeyDialog.vue";
import Confirm from "../Confirm.vue";
import EmptyState from "../EmptyState.vue";

export default {
    components: {
        APIKeyDialog,
        Confirm,
        EmptyState,
    },
    data() {
        return {
            apiKeyList: [],
            legacyKeyList: [],
            selectedKeyID: null,
        };
    },
    computed: {
        settings() {
            return this.$parent.$parent.settings;
        },
    },

    mounted() {
        this.loadAPIKeys();
    },

    methods: {
        loadAPIKeys() {
            this.$root.getAPIKeyList((res) => {
                if (res.ok) {
                    this.apiKeyList = res.apiKeyList;
                }
            });
        },

        apiKeyStatus(item) {
            if (!item.enabled) {
                return "inactive";
            }
            if (item.expiresAt && new Date(item.expiresAt) < new Date()) {
                return "expired";
            }
            return "active";
        },

        /**
         * Show dialog to confirm deletion of Better Auth key
         * @param {string} keyID ID of key to delete
         * @returns {void}
         */
        deleteDialog(keyID) {
            this.selectedKeyID = keyID;
            this.$refs.confirmDelete.show();
        },

        /**
         * Delete a Better Auth key
         * @returns {void}
         */
        deleteKey() {
            this.$root.deleteAPIKey(this.selectedKeyID, (res) => {
                if (res.ok) {
                    this.loadAPIKeys();
                    this.$root.toastRes(res);
                } else {
                    this.$root.toastError(res.msg);
                }
            });
        },
    },
};
</script>
