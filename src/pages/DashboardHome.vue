<template>
    <div v-if="$route.name === 'DashboardHome'" class="carbon-home">
        <h1>{{ $t("Overview") }}</h1>
        <StatusFinding>
            <template v-if="lastIncident">
                {{ $t("lastIncident", [lastIncident.name, shortDate(lastIncident.time)]) }}
            </template>
        </StatusFinding>

        <div class="carbon-strip">
            <span class="big" :class="summary.down > 0 ? 'down' : 'up'">
                <span class="carbon-dot" aria-hidden="true"><i /></span>
                {{ $t("upOfTotal", [summary.up, running]) }}
            </span>
            <i18n-t keypath="countDown" tag="span">
                <b>{{ summary.down }}</b>
            </i18n-t>
            <i18n-t keypath="countMaintenance" tag="span">
                <b>{{ summary.maintenance }}</b>
            </i18n-t>
            <i18n-t keypath="countPaused" tag="span">
                <b>{{ summary.paused }}</b>
            </i18n-t>
            <i18n-t v-if="avgPing != null" keypath="avgResponse" tag="span">
                <b>{{ avgPing }} ms</b>
            </i18n-t>
        </div>

        <div class="carbon-home-grid">
            <section>
                <div class="carbon-section-head">
                    <h2>{{ $t("Needs attention") }}</h2>
                </div>

                <EmptyState
                    v-if="summary.downList.length === 0"
                    illustration="lighthouse"
                    large
                    :title="$t('Nothing needs you right now')"
                >
                    {{ calmText }}
                </EmptyState>

                <div v-for="monitor in summary.downList" :key="monitor.id" class="carbon-event carbon-linkrow">
                    <span class="carbon-dot down" aria-hidden="true"><i /></span>
                    <span class="text">
                        <router-link :to="`/dashboard/${monitor.id}`" class="carbon-linkrow-target">
                            {{ monitor.name }}
                        </router-link>
                        <span class="sub">{{ downDetail(monitor) }}</span>
                    </span>
                    <span class="when">{{ shortDate($root.statusSince[monitor.id]) }}</span>
                </div>
            </section>

            <section>
                <div class="carbon-section-head">
                    <h2>{{ $t("Recently") }}</h2>
                    <button
                        v-if="importantHeartBeatListLength > 0"
                        type="button"
                        class="carbon-quiet"
                        :disabled="clearingAllEvents"
                        @click="clearAllEventsDialog"
                    >
                        {{ $t("Clear") }}
                    </button>
                </div>

                <div v-for="(beat, index) in displayedRecords" :key="index" class="carbon-event carbon-linkrow">
                    <span class="carbon-dot" :class="statusKey(beat.status)" aria-hidden="true"><i /></span>
                    <span class="text">
                        <router-link :to="`/dashboard/${beat.monitorID}`" class="carbon-linkrow-target">
                            {{ eventTitle(beat) }}
                        </router-link>
                        <span v-if="beat.msg" class="sub">{{ beat.msg }}</span>
                    </span>
                    <span class="when" :title="$root.datetime(beat.time)">{{ shortDate(beat.time) }}</span>
                </div>

                <div v-if="importantHeartBeatListLength === 0" class="carbon-empty-line">
                    {{ $t("No important events") }}
                </div>

                <div v-if="importantHeartBeatListLength > perPage" class="kuma_pagination">
                    <pagination
                        v-model="page"
                        :records="importantHeartBeatListLength"
                        :per-page="perPage"
                        :options="paginationConfig"
                    />
                </div>
            </section>
        </div>
    </div>
    <Confirm
        ref="confirmClearEvents"
        btn-style="btn-danger"
        :yes-text="$t('Yes')"
        :no-text="$t('No')"
        @yes="clearAllEvents"
    >
        {{ $t("clearAllEventsMsg") }}
    </Confirm>
    <router-view ref="child" />
</template>

<script>
import dayjs from "dayjs";
import Pagination from "v-pagination-3";
import Confirm from "../components/Confirm.vue";
import StatusFinding from "../components/StatusFinding.vue";
import EmptyState from "../components/EmptyState.vue";
import { shortDuration } from "../util-frontend";
import { UP, DOWN, PENDING, MAINTENANCE } from "../util.ts";

// Channel names that are plain words read lowercase inside a sentence
const GENERIC_NAMES = /^(email|e-mail|webhook|sms)$/i;

export default {
    components: {
        Pagination,
        Confirm,
        StatusFinding,
        EmptyState,
    },
    props: {
        calculatedHeight: {
            type: Number,
            default: 0,
        },
    },
    data() {
        return {
            page: 1,
            perPage: 8,
            paginationConfig: {
                hideCount: true,
                chunksNavigation: "scroll",
            },
            importantHeartBeatListLength: 0,
            displayedRecords: [],
            clearingAllEvents: false,
        };
    },
    computed: {
        summary() {
            return this.$root.checkSummary;
        },

        running() {
            return this.summary.total - this.summary.paused;
        },

        /**
         * Mean of the 24-hour average response times
         * @returns {number|null} Milliseconds, or null without data
         */
        avgPing() {
            const pings = Object.values(this.$root.monitorList)
                .filter((m) => m.type !== "group" && m.active)
                .map((m) => this.$root.avgPingList[m.id])
                .filter((ping) => typeof ping === "number");
            if (pings.length === 0) {
                return null;
            }
            return Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);
        },

        /**
         * The latest down event, told when nothing is down now
         * @returns {object|null} Monitor name and time
         */
        lastIncident() {
            if (this.summary.down > 0) {
                return null;
            }
            const beat = this.displayedRecords.find((b) => b.status === DOWN);
            const monitor = beat && this.$root.monitorList[beat.monitorID];
            return monitor ? { name: monitor.name, time: beat.time } : null;
        },

        /**
         * "Bark and email tell you the moment one goes down."
         * @returns {string} Sentence for the calm state
         */
        calmText() {
            const names = this.$root.notificationList.map((n) =>
                GENERIC_NAMES.test(n.name) ? n.name.toLowerCase() : n.name
            );
            if (names.length === 0) {
                return this.$t("No monitor is down right now.");
            }
            const list = new Intl.ListFormat(this.$i18n.locale, { type: "conjunction" }).format(names);
            return this.$t(names.length === 1 ? "nothingDownNotified" : "nothingDownNotifiedMany", [list]);
        },
    },
    watch: {
        perPage() {
            this.$nextTick(() => {
                this.getImportantHeartbeatListPaged();
            });
        },

        page() {
            this.getImportantHeartbeatListPaged();
        },
    },

    mounted() {
        this.getImportantHeartbeatListLength();
        this.$root.loadStatusSince();

        this.$root.emitter.on("newImportantHeartbeat", this.onNewImportantHeartbeat);
    },

    beforeUnmount() {
        this.$root.emitter.off("newImportantHeartbeat", this.onNewImportantHeartbeat);
    },

    methods: {
        /**
         * Date of a heartbeat time: the clock time today, the day and month before that
         * @param {string} time UTC time from the server
         * @returns {string} Short date
         */
        shortDate(time) {
            if (!time) {
                return "";
            }
            const local = dayjs.utc(time).local();
            return local.isSame(dayjs(), "day") ? local.format("HH:mm") : local.format("D.M.");
        },

        /**
         * Colour key for a heartbeat status
         * @param {number} status Heartbeat status
         * @returns {string} Key used by .carbon-dot
         */
        statusKey(status) {
            return { [UP]: "up", [DOWN]: "down", [PENDING]: "pending", [MAINTENANCE]: "maintenance" }[status] ?? "wait";
        },

        /**
         * What happened, in words: "Shop is down"
         * @param {object} beat Important heartbeat
         * @returns {string} Event title
         */
        eventTitle(beat) {
            const name = this.$root.monitorList[beat.monitorID]?.name ?? `#${beat.monitorID}`;
            const keys = {
                [UP]: "eventUp",
                [DOWN]: "eventDown",
                [PENDING]: "eventPending",
                [MAINTENANCE]: "eventMaintenance",
            };
            return this.$t(keys[beat.status] ?? "eventUp", [name]);
        },

        /**
         * How long a monitor has been down and why
         * @param {object} monitor Monitor that is down
         * @returns {string} Detail line
         */
        downDetail(monitor) {
            const since = this.$root.statusSince[monitor.id];
            const msg = this.$root.lastHeartbeatList[monitor.id]?.msg;
            const parts = [];
            if (since) {
                parts.push(this.$t("downForLong", [shortDuration(dayjs().diff(dayjs.utc(since), "second"))]));
            }
            if (msg) {
                parts.push(msg);
            }
            return parts.join(" · ");
        },

        /**
         * Updates the displayed records when a new important heartbeat arrives.
         * @param {object} heartbeat - The heartbeat object received.
         * @returns {void}
         */
        onNewImportantHeartbeat(heartbeat) {
            if (this.page === 1) {
                this.displayedRecords.unshift(heartbeat);
                if (this.displayedRecords.length > this.perPage) {
                    this.displayedRecords.pop();
                }
                this.importantHeartBeatListLength += 1;
            }
        },

        /**
         * Retrieves the length of the important heartbeat list for all monitors.
         * @returns {void}
         */
        getImportantHeartbeatListLength() {
            this.$root.getSocket().emit("monitorImportantHeartbeatListCount", null, (res) => {
                if (res.ok) {
                    this.importantHeartBeatListLength = res.count;
                    this.getImportantHeartbeatListPaged();
                }
            });
        },

        /**
         * Retrieves the important heartbeat list for the current page.
         * @returns {void}
         */
        getImportantHeartbeatListPaged() {
            const offset = (this.page - 1) * this.perPage;
            this.$root.getSocket().emit("monitorImportantHeartbeatListPaged", null, offset, this.perPage, (res) => {
                if (res.ok) {
                    this.displayedRecords = res.data;
                }
            });
        },

        clearAllEventsDialog() {
            this.$refs.confirmClearEvents.show();
        },
        clearAllEvents() {
            this.clearingAllEvents = true;
            const monitorIDs = Object.keys(this.$root.monitorList);
            let failed = 0;
            const total = monitorIDs.length;

            if (total === 0) {
                this.clearingAllEvents = false;
                this.$root.toastError(this.$t("No monitors found"));
                return;
            }

            monitorIDs.forEach((monitorID) => {
                this.$root.getSocket().emit("clearEvents", monitorID, (res) => {
                    if (!res || !res.ok) {
                        failed++;
                    }
                });
            });
            this.clearingAllEvents = false;
            this.page = 1;
            this.getImportantHeartbeatListLength();
            if (failed === 0) {
                this.$root.toastSuccess(this.$t("Events cleared successfully"));
            } else {
                this.$root.toastError(
                    this.$t("Could not clear events", {
                        failed,
                        total,
                    })
                );
            }
        },
    },
};
</script>
