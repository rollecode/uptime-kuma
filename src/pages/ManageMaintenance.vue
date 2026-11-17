<template>
    <div class="carbon-page">
        <div class="carbon-top">
            <h1>{{ $t("Maintenance") }}</h1>
            <div class="carbon-tools">
                <router-link to="/add-maintenance" class="btn btn-primary">
                    {{ $t("Schedule maintenance") }}
                </router-link>
            </div>
        </div>

        <EmptyState
            v-if="Object.keys(sortedMaintenanceList).length === 0"
            illustration="watch"
            :title="$t('No maintenance scheduled')"
            class="mt-4"
        >
            {{ $t("maintenanceEmptyHelp") }}
        </EmptyState>

        <div v-else class="mt-3">
            <div v-for="(item, index) in sortedMaintenanceList" :key="index" class="carbon-event carbon-linkrow item">
                <span class="carbon-dot" :class="maintenanceDot(item.status)" aria-hidden="true"><i /></span>
                <span class="text">
                    <router-link :to="'/maintenance/edit/' + item.id" class="carbon-linkrow-target">
                        {{ item.title }}
                    </router-link>
                    <span class="sub">
                        {{ $t("maintenanceStatus-" + item.status) }}
                        <MaintenanceTime :maintenance="item" />
                    </span>
                </span>
                <span class="when">
                    <button
                        v-if="item.active"
                        type="button"
                        class="carbon-quiet"
                        :aria-label="$t('ariaPauseMaintenance')"
                        @click="pauseDialog(item.id)"
                    >
                        {{ $t("Pause") }}
                    </button>
                    <button
                        v-else
                        type="button"
                        class="carbon-quiet"
                        :aria-label="$t('ariaResumeMaintenance')"
                        @click="resumeMaintenance(item.id)"
                    >
                        {{ $t("Resume") }}
                    </button>
                    <router-link
                        :to="'/maintenance/clone/' + item.id"
                        class="carbon-quiet ms-3"
                        :aria-label="$t('ariaCloneMaintenance')"
                    >
                        {{ $t("Clone") }}
                    </router-link>
                    <button
                        type="button"
                        class="carbon-quiet ms-3"
                        :aria-label="$t('ariaDeleteMaintenance')"
                        @click="deleteDialog(item.id)"
                    >
                        {{ $t("Delete") }}
                    </button>
                </span>
            </div>
        </div>

        <a
            class="carbon-quiet d-inline-block mt-4"
            href="https://github.com/louislam/uptime-kuma/wiki/Maintenance"
            target="_blank"
        >
            {{ $t("Learn more") }}
        </a>

        <Confirm ref="confirmPause" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="pauseMaintenance">
            {{ $t("pauseMaintenanceMsg") }}
        </Confirm>

        <Confirm
            ref="confirmDelete"
            btn-style="btn-danger"
            :yes-text="$t('Yes')"
            :no-text="$t('No')"
            @yes="deleteMaintenance"
        >
            {{ $t("deleteMaintenanceMsg") }}
        </Confirm>
    </div>
</template>

<script>
import EmptyState from "../components/EmptyState.vue";
import { getResBaseURL } from "../util-frontend";
import Confirm from "../components/Confirm.vue";
import MaintenanceTime from "../components/MaintenanceTime.vue";

export default {
    components: {
        MaintenanceTime,
        Confirm,
        EmptyState,
    },
    data() {
        return {
            selectedMaintenanceID: undefined,
            statusOrderList: {
                "under-maintenance": 1000,
                scheduled: 900,
                inactive: 800,
                ended: 700,
                unknown: 0,
            },
        };
    },
    computed: {
        sortedMaintenanceList() {
            let result = Object.values(this.$root.maintenanceList);

            result.sort((m1, m2) => {
                if (this.statusOrderList[m1.status] === this.statusOrderList[m2.status]) {
                    return m1.title.localeCompare(m2.title);
                } else {
                    return this.statusOrderList[m1.status] < this.statusOrderList[m2.status];
                }
            });

            return result;
        },
    },
    mounted() {},
    methods: {
        /**
         * Dot colour for a maintenance status
         * @param {string} status Maintenance status
         * @returns {string} Key used by .carbon-dot
         */
        maintenanceDot(status) {
            return { "under-maintenance": "maintenance", scheduled: "up" }[status] ?? "wait";
        },

        /**
         * Get the correct URL for the icon
         * @param {string} icon Path for icon
         * @returns {string} Correctly formatted path including port numbers
         */
        icon(icon) {
            if (icon === "/icon.svg") {
                return icon;
            } else {
                return getResBaseURL() + icon;
            }
        },

        /**
         * Show delete confirmation
         * @param {number} maintenanceID ID of maintenance to show delete
         * confirmation for.
         * @returns {void}
         */
        deleteDialog(maintenanceID) {
            this.selectedMaintenanceID = maintenanceID;
            this.$refs.confirmDelete.show();
        },

        /**
         * Delete maintenance after showing confirmation dialog
         * @returns {void}
         */
        deleteMaintenance() {
            this.$root.deleteMaintenance(this.selectedMaintenanceID, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.$router.push("/maintenance");
                }
            });
        },

        /**
         * Show dialog to confirm pause
         * @param {number} maintenanceID ID of maintenance to confirm
         * pause.
         * @returns {void}
         */
        pauseDialog(maintenanceID) {
            this.selectedMaintenanceID = maintenanceID;
            this.$refs.confirmPause.show();
        },

        /**
         * Pause maintenance
         * @returns {void}
         */
        pauseMaintenance() {
            this.$root.getSocket().emit("pauseMaintenance", this.selectedMaintenanceID, (res) => {
                this.$root.toastRes(res);
            });
        },

        /**
         * Resume maintenance
         * @param {number} id ID of maintenance to resume
         * @returns {void}
         */
        resumeMaintenance(id) {
            this.$root.getSocket().emit("resumeMaintenance", id, (res) => {
                this.$root.toastRes(res);
            });
        },
    },
};
</script>
