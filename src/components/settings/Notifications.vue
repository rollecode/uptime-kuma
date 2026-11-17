<template>
    <div>
        <section class="carbon-setting">
            <div class="carbon-setting-label">
                <h3>{{ $t("Notifications") }}</h3>
                <p>{{ $t("notificationDescription") }}</p>
            </div>
            <div class="carbon-setting-control">
                <div
                    v-for="notification in $root.notificationList"
                    :key="notification.id"
                    class="carbon-channel carbon-linkrow"
                >
                    <span class="name">{{ notification.name }}</span>
                    <span class="type">{{ channelType(notification) }}</span>
                    <span v-if="notification.isDefault" class="carbon-tag">{{ $t("Default") }}</span>
                    <button type="button" class="carbon-quiet" @click="testChannel(notification)">
                        {{ $t("Test") }}
                    </button>
                    <button
                        type="button"
                        class="carbon-quiet carbon-linkrow-target"
                        @click="$refs.notificationDialog.show(notification.id)"
                    >
                        {{ $t("Edit") }}
                    </button>
                </div>
                <EmptyState
                    v-if="$root.notificationList.length === 0"
                    illustration="pigeons"
                    :title="$t('No notification channels yet')"
                    class="mb-3"
                >
                    {{ $t("notificationsEmptyHelp") }}
                </EmptyState>
                <button class="btn btn-normal" type="button" @click="$refs.notificationDialog.show()">
                    {{ $t("Setup Notification") }}
                </button>
            </div>
        </section>

        <section class="carbon-setting">
            <div class="carbon-setting-label">
                <h3>{{ $t("monitorToastMessagesLabel") }}</h3>
                <p>{{ $t("monitorToastMessagesDescription") }}</p>
            </div>
            <div class="carbon-setting-control">
                <label for="toastErrorTimeoutSecs" class="form-label">{{ $t("toastErrorTimeout") }}</label>
                <input
                    id="toastErrorTimeoutSecs"
                    v-model="toastErrorTimeoutSecs"
                    type="number"
                    class="form-control"
                    min="-1"
                    step="1"
                />
                <label for="toastSuccessTimeoutSecs" class="form-label mt-3">{{ $t("toastSuccessTimeout") }}</label>
                <input
                    id="toastSuccessTimeoutSecs"
                    v-model="toastSuccessTimeoutSecs"
                    type="number"
                    class="form-control"
                    min="-1"
                    step="1"
                />
            </div>
        </section>

        <section class="carbon-setting">
            <div class="carbon-setting-label">
                <h3>{{ $t("settingsCertificateExpiry") }}</h3>
                <p>{{ $t("certificationExpiryDescription") }}</p>
            </div>
            <div class="carbon-setting-control">
                <div class="carbon-chips">
                    <span v-for="day in settings.tlsExpiryNotifyDays" :key="day" class="carbon-chip">
                        {{ $t("days", day) }}
                        <button
                            type="button"
                            :aria-label="$t('Remove the expiry notification')"
                            @click="removeTlsExpiryNotifDay(day)"
                        >
                            ×
                        </button>
                    </span>
                    <form class="carbon-chip-add" @submit.prevent="addTlsExpiryNotifDay(tlsExpiryNotifInput)">
                        <input
                            v-model="tlsExpiryNotifInput"
                            type="number"
                            min="1"
                            class="form-control"
                            :placeholder="$t('days', 1)"
                            :aria-label="$t('Add a new expiry notification day')"
                        />
                        <button type="submit" class="carbon-quiet">{{ $t("Add") }}</button>
                    </form>
                </div>
            </div>
        </section>

        <section class="carbon-setting">
            <div class="carbon-setting-label">
                <h3>{{ $t("settingsDomainExpiry") }}</h3>
                <p>{{ $t("domainExpiryDescription") }}</p>
            </div>
            <div class="carbon-setting-control">
                <div class="carbon-chips">
                    <span v-for="day in settings.domainExpiryNotifyDays" :key="day" class="carbon-chip">
                        {{ $t("days", day) }}
                        <button
                            type="button"
                            :aria-label="$t('Remove the expiry notification')"
                            @click="removeDomainExpiryNotifDay(day)"
                        >
                            ×
                        </button>
                    </span>
                    <form class="carbon-chip-add" @submit.prevent="addDomainExpiryNotifDay(domainExpiryNotifInput)">
                        <input
                            v-model="domainExpiryNotifInput"
                            type="number"
                            min="1"
                            class="form-control"
                            :placeholder="$t('days', 1)"
                            :aria-label="$t('Add a new expiry notification day')"
                        />
                        <button type="submit" class="carbon-quiet">{{ $t("Add") }}</button>
                    </form>
                </div>
                <div class="carbon-setting-save">
                    <button class="btn btn-primary" type="button" @click="saveSettings()">{{ $t("Save") }}</button>
                </div>
            </div>
        </section>

        <NotificationDialog ref="notificationDialog" />
    </div>
</template>

<script>
import NotificationDialog from "../../components/NotificationDialog.vue";
import EmptyState from "../EmptyState.vue";

export default {
    components: {
        NotificationDialog,
        EmptyState,
    },

    data() {
        return {
            toastSuccessTimeoutSecs: 20,
            toastErrorTimeoutSecs: -1,
            typeNames: {},
            /**
             * Variable to store the input for new certificate expiry day.
             */
            tlsExpiryNotifInput: null,
            domainExpiryNotifInput: null,
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
    },

    watch: {
        // Parse, store and apply new timeout settings.
        toastSuccessTimeoutSecs(newTimeout) {
            const parsedTimeout = parseInt(newTimeout);
            if (parsedTimeout != null && !Number.isNaN(parsedTimeout)) {
                localStorage.toastSuccessTimeout = newTimeout > 0 ? newTimeout * 1000 : newTimeout;
            }
        },
        toastErrorTimeoutSecs(newTimeout) {
            const parsedTimeout = parseInt(newTimeout);
            if (parsedTimeout != null && !Number.isNaN(parsedTimeout)) {
                localStorage.toastErrorTimeout = newTimeout > 0 ? newTimeout * 1000 : newTimeout;
            }
        },
    },

    mounted() {
        this.loadToastTimeoutSettings();
        this.typeNames = Object.assign({}, ...Object.values(this.$refs.notificationDialog.notificationNameList));
    },

    methods: {
        /**
         * Display name of a channel's service, e.g. "Email (SMTP)"
         * @param {object} notification Notification row
         * @returns {string} Service name
         */
        channelType(notification) {
            const type = JSON.parse(notification.config).type;
            return this.typeNames[type] ?? type;
        },

        /**
         * Send a test message through a saved channel
         * @param {object} notification Notification row
         * @returns {void}
         */
        testChannel(notification) {
            this.$root.getSocket().emit("testNotification", JSON.parse(notification.config), (res) => {
                this.$root.toastRes(res);
            });
        },

        /**
         * Remove a day from tls expiry notification days.
         * @param {number} day The day to remove.
         * @returns {void}
         */
        removeTlsExpiryNotifDay(day) {
            this.settings.tlsExpiryNotifyDays = this.settings.tlsExpiryNotifyDays.filter((d) => d !== day);
        },
        /**
         * Add a new tls expiry notification day.
         * Will verify:
         * - day is not null or empty string.
         * - day is a number.
         * - day is > 0.
         * - The day is not already in the list.
         * @param {number} day The day number to add.
         * @returns {void}
         */
        addTlsExpiryNotifDay(day) {
            if (day != null && day !== "") {
                const parsedDay = parseInt(day);
                if (parsedDay != null && !isNaN(parsedDay) && parsedDay > 0) {
                    if (!this.settings.tlsExpiryNotifyDays.includes(parsedDay)) {
                        this.settings.tlsExpiryNotifyDays.push(parseInt(day));
                        this.settings.tlsExpiryNotifyDays.sort((a, b) => a - b);
                        this.tlsExpiryNotifInput = null;
                    }
                }
            }
        },
        /**
         * Remove a day from domain expiry notification days.
         * @param {number} day The day to remove.
         * @returns {void}
         */
        removeDomainExpiryNotifDay(day) {
            this.settings.domainExpiryNotifyDays = this.settings.domainExpiryNotifyDays.filter((d) => d !== day);
        },
        /**
         * Add a new domain expiry notification day.
         * Will verify:
         * - day is not null or empty string.
         * - day is a number.
         * - day is > 0.
         * - The day is not already in the list.
         * @param {number} day The day number to add.
         * @returns {void}
         */
        addDomainExpiryNotifDay(day) {
            if (day != null && day !== "") {
                const parsedDay = parseInt(day);
                if (parsedDay != null && !isNaN(parsedDay) && parsedDay > 0) {
                    if (!this.settings.domainExpiryNotifyDays.includes(parsedDay)) {
                        this.settings.domainExpiryNotifyDays.push(parseInt(day));
                        this.settings.domainExpiryNotifyDays.sort((a, b) => a - b);
                        this.domainExpiryNotifInput = null;
                    }
                }
            }
        },

        /**
         * Loads toast timeout settings from storage to component data.
         * @returns {void}
         */
        loadToastTimeoutSettings() {
            const successTimeout = localStorage.toastSuccessTimeout;
            if (successTimeout !== undefined) {
                const parsedTimeout = parseInt(successTimeout);
                if (parsedTimeout != null && !Number.isNaN(parsedTimeout)) {
                    this.toastSuccessTimeoutSecs = parsedTimeout > 0 ? parsedTimeout / 1000 : parsedTimeout;
                }
            }

            const errorTimeout = localStorage.toastErrorTimeout;
            if (errorTimeout !== undefined) {
                const parsedTimeout = parseInt(errorTimeout);
                if (parsedTimeout != null && !Number.isNaN(parsedTimeout)) {
                    this.toastErrorTimeoutSecs = parsedTimeout > 0 ? parsedTimeout / 1000 : parsedTimeout;
                }
            }
        },
    },
};
</script>
