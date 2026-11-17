<template>
    <div>
        <section class="carbon-setting">
            <div class="carbon-setting-label">
                <h3>{{ $t("Keep history for") }}</h3>
                <p>{{ $t("historyForeverHelp") }}</p>
            </div>
            <div class="carbon-setting-control">
                <div class="carbon-unit">
                    <input
                        id="keepDataPeriodDays"
                        v-model="settings.keepDataPeriodDays"
                        type="number"
                        class="form-control"
                        required
                        min="0"
                        step="1"
                        :aria-label="$t('Keep history for')"
                    />
                    <span>{{ $t("daysUnit", Number(settings.keepDataPeriodDays) || 0) }}</span>
                </div>
                <div v-if="settings.keepDataPeriodDays < 0" class="form-text">
                    {{ $t("dataRetentionTimeError") }}
                </div>
                <div class="mt-3">
                    <button class="btn btn-primary" type="button" @click="saveSettings()">{{ $t("Save") }}</button>
                </div>
            </div>
        </section>

        <section class="carbon-setting">
            <div class="carbon-setting-label">
                <h3>{{ $t("Database") }}</h3>
                <i18n-t v-if="$root.info.dbType === 'sqlite'" tag="p" keypath="shrinkDatabaseDescriptionSqlite">
                    <template #vacuum><code>VACUUM</code></template>
                    <template #auto_vacuum><code>AUTO_VACUUM</code></template>
                </i18n-t>
            </div>
            <div class="carbon-setting-control d-flex flex-wrap gap-2 align-items-start">
                <button v-if="$root.info.dbType === 'sqlite'" class="btn btn-normal" @click="shrinkDatabase">
                    {{ $t("Shrink database") }} ({{ databaseSizeDisplay }})
                </button>
                <button id="clearAllStats-btn" class="btn btn-outline-danger" @click="confirmClearStatistics">
                    {{ $t("Clear all statistics") }}
                </button>
            </div>
        </section>
        <Confirm
            ref="confirmClearStatistics"
            btn-style="btn-danger"
            :yes-text="$t('Yes')"
            :no-text="$t('No')"
            @yes="clearStatistics"
        >
            {{ $t("confirmClearStatisticsMsg") }}
        </Confirm>
    </div>
</template>

<script>
import Confirm from "../../components/Confirm.vue";
import { log } from "../../util.ts";

export default {
    components: {
        Confirm,
    },

    data() {
        return {
            databaseSize: 0,
        };
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
        databaseSizeDisplay() {
            return Math.round((this.databaseSize / 1024 / 1024) * 10) / 10 + " MB";
        },
    },

    mounted() {
        this.loadDatabaseSize();
    },

    methods: {
        /**
         * Get the current size of the database
         * @returns {void}
         */
        loadDatabaseSize() {
            log.debug("monitorhistory", "load database size");
            this.$root.getSocket().emit("getDatabaseSize", (res) => {
                if (res.ok) {
                    this.databaseSize = res.size;
                    log.debug("monitorhistory", "database size: " + res.size);
                } else {
                    log.debug("monitorhistory", res);
                }
            });
        },

        /**
         * Request that the database is shrunk
         * @returns {void}
         */
        shrinkDatabase() {
            this.$root.getSocket().emit("shrinkDatabase", (res) => {
                if (res.ok) {
                    this.loadDatabaseSize();
                    this.$root.toastSuccess("Done");
                } else {
                    log.debug("monitorhistory", res);
                }
            });
        },

        /**
         * Show the dialog to confirm clearing stats
         * @returns {void}
         */
        confirmClearStatistics() {
            this.$refs.confirmClearStatistics.show();
        },

        /**
         * Send the request to clear stats
         * @returns {void}
         */
        clearStatistics() {
            this.$root.clearStatistics((res) => {
                if (res.ok) {
                    this.$router.go();
                } else {
                    this.$root.toastError(res.msg);
                }
            });
        },
    },
};
</script>
