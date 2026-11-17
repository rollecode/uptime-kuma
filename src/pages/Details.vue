<template>
    <div v-if="monitor" class="carbon-detail">
        <router-link v-if="group !== ''" :to="monitorURL(monitor.parent)" class="carbon-detail-group">
            {{ group }}
        </router-link>

        <div class="carbon-detail-top">
            <div class="carbon-detail-title">
                <h1>
                    {{ monitor.name }}
                    <span class="monitor-id">#{{ monitor.id }}</span>
                </h1>
                <div class="carbon-detail-sub url">
                    <template v-if="isUrlType">
                        <a :href="monitor.url" target="_blank" rel="noopener noreferrer">
                            {{ filterPassword(monitor.url) }}
                        </a>
                        ·
                    </template>
                    <template v-else-if="target">{{ target }} ·</template>
                    {{ checkLine }}
                </div>
                <div v-if="targetDetail" class="carbon-detail-sub">{{ targetDetail }}</div>
                <div v-if="state.key === 'down' && lastHeartBeat.msg" class="carbon-detail-sub">
                    {{ lastHeartBeat.msg }}
                </div>
                <!-- eslint-disable-next-line vue/no-v-html-->
                <div v-if="monitor.description" class="carbon-detail-desc" v-html="descriptionHTML"></div>
                <div v-if="monitor.tags.length > 0" class="tags">
                    <Tag
                        v-for="tag in monitor.tags"
                        :key="tag.id"
                        :item="tag"
                        :size="'sm'"
                        :scrollable="true"
                        :constrained="true"
                    />
                </div>
            </div>

            <div class="carbon-actions">
                <button v-if="monitor.active" type="button" class="carbon-action" @click="pauseDialog">
                    {{ $t("Pause") }}
                </button>
                <button
                    v-else
                    type="button"
                    class="carbon-action"
                    :disabled="monitor.forceInactive"
                    @click="resumeMonitor"
                >
                    {{ $t("Resume") }}
                </button>
                <router-link :to="'/edit/' + monitor.id" class="carbon-action">{{ $t("Edit") }}</router-link>
                <router-link :to="'/clone/' + monitor.id" class="carbon-action">{{ $t("Clone") }}</router-link>
                <div class="dropdown">
                    <button
                        type="button"
                        class="carbon-action"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        :aria-label="$t('More actions')"
                    >
                        ···
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <button type="button" class="dropdown-item" @click="clearEventsDialog">
                                {{ $t("Clear events") }}
                            </button>
                        </li>
                        <li>
                            <button type="button" class="dropdown-item" @click="clearHeartbeatsDialog">
                                {{ $t("Clear heartbeats") }}
                            </button>
                        </li>
                        <li>
                            <button type="button" class="dropdown-item" @click="deleteDialog">
                                {{ $t("Delete") }}
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="carbon-facts">
            <div class="fact">
                <div class="k">{{ stateFact.label }}</div>
                <div class="v" :class="stateFact.tone">{{ stateFact.value }}</div>
                <span class="visually-hidden" data-testid="monitor-status">{{ state.label }}</span>
            </div>
            <div class="fact">
                <div class="k">{{ monitor.type === "push" ? $t("Last ping") : $t("Last check") }}</div>
                <div class="v">{{ lastCheck }}</div>
            </div>
            <template v-if="hasResponseTimes">
                <div class="fact">
                    <div class="k">{{ $t("Response now") }}</div>
                    <div class="v">{{ msText(lastHeartBeat.ping) }}</div>
                </div>
                <div class="fact">
                    <div class="k">{{ $t("Response, avg 24 h") }}</div>
                    <div class="v">{{ msText($root.avgPingList[monitor.id]) }}</div>
                </div>
            </template>
            <div class="fact">
                <div class="k">{{ $t("Uptime 24 h") }}</div>
                <div class="v">{{ uptimeText("24") }}</div>
            </div>
            <div class="fact">
                <div class="k">{{ $t("Uptime 30 d") }}</div>
                <div class="v">{{ uptimeText("720") }}</div>
            </div>
            <div class="fact">
                <div class="k">{{ $t("Uptime 1 y") }}</div>
                <div class="v">{{ uptimeText("1y") }}</div>
            </div>
            <div v-if="tlsInfo" class="fact">
                <div class="k">{{ $t("Certificate expires") }}</div>
                <button type="button" class="v carbon-link" @click="toggleCertInfoBox = !toggleCertInfoBox">
                    {{ $t("days", tlsInfo.certInfo.daysRemaining) }}
                    <span v-if="tlsInfo.hostnameMatchMonitorUrl === false" :title="$t('certHostnameMismatch')">⚠</span>
                </button>
            </div>
            <div v-if="domainInfo" class="fact">
                <div class="k">{{ $t("Domain expires") }}</div>
                <div class="v">{{ $t("days", domainInfo.daysRemaining) }}</div>
            </div>
        </div>

        <div v-if="showCertInfoBox" class="carbon-section">
            <certificate-info :certInfo="tlsInfo.certInfo" :valid="tlsInfo.valid" />
        </div>

        <div v-if="monitor.type !== 'group'" class="carbon-strip-bars">
            <HeartbeatBar size="small" :monitor-id="monitor.id" />
        </div>

        <!-- Push URL and example -->
        <div v-if="monitor.type === 'push'" class="carbon-section">
            <h2>{{ $t("Push URL") }}</h2>
            <p class="carbon-muted">{{ $t("pushUrlHelp", [interval]) }}</p>
            <div class="carbon-copy">
                <input class="form-control" readonly :value="pushURL" :aria-label="$t('Push URL')" @focus="selectAll" />
                <button type="button" class="btn btn-normal" @click="copy(pushURL, 'url')">
                    {{ copied === "url" ? $t("Copied") : $t("Copy") }}
                </button>
            </div>

            <details class="carbon-disclosure" :open="pushMonitor.showPushExamples">
                <summary>{{ $t("Show example") }}</summary>
                <div class="carbon-seg" role="group" :aria-label="$t('Language')">
                    <button
                        v-for="(label, key) in pushLanguages"
                        :key="key"
                        type="button"
                        :class="{ 'is-on': pushMonitor.currentExample === key }"
                        @click="pushMonitor.currentExample = key"
                    >
                        {{ label }}
                    </button>
                </div>
                <div class="carbon-code">
                    <button type="button" class="carbon-code-copy" @click="copy(pushMonitor.code, 'code')">
                        {{ copied === "code" ? $t("Copied") : $t("Copy") }}
                    </button>
                    <prism-editor
                        v-model="pushMonitor.code"
                        class="css-editor"
                        :highlight="pushExampleHighlighter"
                        readonly
                    ></prism-editor>
                </div>
            </details>
        </div>

        <!-- Group: its members -->
        <div v-if="monitor.type === 'group'" class="carbon-section">
            <h2>{{ $t("In this group") }}</h2>
            <div v-for="child in children" :key="child.id" class="carbon-event carbon-linkrow">
                <span class="carbon-dot" :class="childState(child).key" aria-hidden="true"><i /></span>
                <span class="text">
                    <router-link :to="monitorURL(child.id)" class="carbon-linkrow-target">{{ child.name }}</router-link>
                    <span class="sub">
                        <span :class="`s-${childState(child).key}`">{{ childState(child).label }}</span>
                        · {{ monitorTypeLabel(child) }}
                    </span>
                </span>
                <span class="when">{{ formatUptime($root.uptimeList[`${child.id}_24`]) }}</span>
            </div>
            <p v-if="children.length === 0" class="carbon-muted">{{ $t("This group has no monitors yet.") }}</p>
        </div>

        <!-- Response times -->
        <div v-else-if="hasResponseTimes" class="carbon-card">
            <PingChart :monitor-id="monitor.id" />
        </div>
        <p v-else class="carbon-muted carbon-section">{{ $t("noResponseTimes") }}</p>

        <table v-if="monitor.type !== 'group'" class="carbon-table">
            <thead>
                <tr>
                    <th>{{ $t("Time period") }}</th>
                    <th>{{ $t("Availability") }}</th>
                    <th>{{ $t("Downtime") }}</th>
                    <th>{{ $t("Incidents") }}</th>
                    <th>{{ $t("Longest incident") }}</th>
                    <th>{{ $t("Avg. incident") }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in periodRows" :key="row.label">
                    <td>{{ row.label }}</td>
                    <td>{{ row.availability }}</td>
                    <td>{{ row.downtime }}</td>
                    <td>{{ row.incidents }}</td>
                    <td>{{ row.longest }}</td>
                    <td>{{ row.average }}</td>
                </tr>
            </tbody>
        </table>

        <!-- Screenshot -->
        <div v-if="monitor.type === 'real-browser'" class="carbon-section zoom-cursor">
            <img
                :src="screenshotURL"
                style="width: 100%"
                alt="screenshot of the website"
                @click="showScreenshotDialog"
            />
            <ScreenshotDialog ref="screenshotDialog" :imageURL="screenshotURL" />
        </div>

        <!-- Events -->
        <div class="carbon-section">
            <div class="carbon-section-head">
                <h2>{{ $t("Events") }}</h2>
                <div class="dropdown">
                    <button type="button" class="carbon-quiet" data-bs-toggle="dropdown" aria-expanded="false">
                        {{ $t("Clear data") }}
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <button type="button" class="dropdown-item" @click="clearEventsDialog">
                                {{ $t("Events") }}
                            </button>
                        </li>
                        <li>
                            <button type="button" class="dropdown-item" @click="clearHeartbeatsDialog">
                                {{ $t("Heartbeats") }}
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <div v-for="(beat, index) in displayedRecords" :key="index" class="carbon-event">
                <span class="carbon-dot" :class="statusKey(beat.status)" aria-hidden="true"><i /></span>
                <span class="text">
                    {{ beat.msg || statusWord(beat.status) }}
                    <span class="sub">{{ statusWord(beat.status) }}</span>
                </span>
                <span class="when" :title="$root.datetime(beat.time)">{{ shortTime(beat.time, true) }}</span>
            </div>

            <EmptyState
                v-if="importantHeartBeatListLength === 0"
                illustration="hourglass"
                :title="$t('Nothing has happened yet')"
            >
                {{ $t("eventsEmptyHelp") }}
            </EmptyState>

            <div v-if="importantHeartBeatListLength > perPage" class="kuma_pagination">
                <pagination
                    v-model="page"
                    :records="importantHeartBeatListLength"
                    :per-page="perPage"
                    :options="paginationConfig"
                />
            </div>
        </div>

        <Confirm ref="confirmPause" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="pauseMonitor">
            {{ $t("pauseMonitorMsg") }}
        </Confirm>

        <Confirm
            ref="confirmDelete"
            btn-style="btn-danger"
            :yes-text="$t('Yes')"
            :no-text="$t('No')"
            @yes="deleteMonitor"
        >
            <div v-if="monitor && monitor.type === 'group'">
                <div>{{ $t("deleteGroupMsg") }}</div>
                <div v-if="hasChildren" class="form-check">
                    <input
                        id="delete-children-checkbox"
                        v-model="deleteChildrenMonitors"
                        class="form-check-input"
                        type="checkbox"
                    />
                    <label class="form-check-label" for="delete-children-checkbox">
                        {{ $t("deleteChildrenMonitors", childrenCount) }}
                    </label>
                </div>
            </div>
            <div v-else>
                {{ $t("deleteMonitorMsg") }}
            </div>
        </Confirm>

        <Confirm
            ref="confirmClearEvents"
            btn-style="btn-danger"
            :yes-text="$t('Yes')"
            :no-text="$t('No')"
            @yes="clearEvents"
        >
            {{ $t("clearEventsMsg") }}
        </Confirm>

        <Confirm
            ref="confirmClearHeartbeats"
            btn-style="btn-danger"
            :yes-text="$t('Yes')"
            :no-text="$t('No')"
            @yes="clearHeartbeats"
        >
            {{ $t("clearHeartbeatsMsg") }}
        </Confirm>
    </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import dayjs from "dayjs";
import { useToast } from "vue-toastification";
const toast = useToast();
import Confirm from "../components/Confirm.vue";
import HeartbeatBar from "../components/HeartbeatBar.vue";
import EmptyState from "../components/EmptyState.vue";
import Pagination from "v-pagination-3";
const PingChart = defineAsyncComponent(() => import("../components/PingChart.vue"));
import Tag from "../components/Tag.vue";
import CertificateInfo from "../components/CertificateInfo.vue";
import { getMonitorRelativeURL, UP, DOWN, PENDING, MAINTENANCE } from "../util.ts";
import { URL } from "whatwg-url";
import DOMPurify from "dompurify";
import { marked } from "marked";
import {
    getResBaseURL,
    formatUptime,
    monitorState,
    monitorTypeLabel,
    shortDuration,
    shortInterval,
    shortTime,
} from "../util-frontend";
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-css";
import { PrismEditor } from "vue-prism-editor";
import "vue-prism-editor/dist/prismeditor.min.css";
import ScreenshotDialog from "../components/ScreenshotDialog.vue";

const HOUR = 3600;
const DAY = 24 * HOUR;
const URL_TYPES = ["http", "keyword", "json-query", "real-browser", "websocket-upgrade"];

export default {
    components: {
        HeartbeatBar,
        Confirm,
        EmptyState,
        Pagination,
        PingChart,
        Tag,
        CertificateInfo,
        PrismEditor,
        ScreenshotDialog,
    },
    data() {
        return {
            page: 1,
            perPage: 10,
            heartBeatList: [],
            toggleCertInfoBox: false,
            now: Date.now(),
            ticker: null,
            copied: null,
            incidentBeats: [],
            weekAvailability: null,
            paginationConfig: {
                hideCount: true,
                chunksNavigation: "scroll",
            },
            cacheTime: Date.now(),
            importantHeartBeatListLength: 0,
            displayedRecords: [],
            pushMonitor: {
                showPushExamples: false,
                currentExample: "bash-curl",
                code: "",
            },
            deleteChildrenMonitors: false,
            // Full monitor loaded on demand: the dashboard list only carries its summary fields
            fetchedMonitor: null,
        };
    },
    computed: {
        monitor() {
            // The dashboard list only carries the fields the list needs, so this page
            // renders nothing until the full monitor has been fetched
            return this.fetchedMonitor;
        },

        /**
         * Get the count of children monitors for this group
         * @returns {number} Number of children monitors
         */
        childrenCount() {
            if (!this.monitor || this.monitor.type !== "group") {
                return 0;
            }
            const children = Object.values(this.$root.monitorList).filter((m) => m.parent === this.monitor.id);
            return children.length;
        },

        /**
         * Check if the monitor is a group and has children
         * @returns {boolean} True if monitor is a group with children
         */
        hasChildren() {
            return this.childrenCount > 0;
        },

        lastHeartBeat() {
            // Also trigger screenshot refresh here
            // eslint-disable-next-line vue/no-side-effects-in-computed-properties
            this.cacheTime = Date.now();

            if (this.monitor.id in this.$root.lastHeartbeatList && this.$root.lastHeartbeatList[this.monitor.id]) {
                return this.$root.lastHeartbeatList[this.monitor.id];
            }

            return {
                status: -1,
            };
        },

        tlsInfo() {
            // Add: this.$root.tlsInfoList[this.monitor.id].certInfo
            // Fix: TypeError: Cannot read properties of undefined (reading 'validTo')
            // Reason: TLS Info object format is changed in 1.8.0, if for some reason, it cannot connect to the site after update to 1.8.0, the object is still in the old format.
            if (this.$root.tlsInfoList[this.monitor.id] && this.$root.tlsInfoList[this.monitor.id].certInfo) {
                return this.$root.tlsInfoList[this.monitor.id];
            }

            return null;
        },

        domainInfo() {
            return this.$root.domainInfoList[this.monitor.id] || null;
        },

        showCertInfoBox() {
            return this.tlsInfo != null && this.toggleCertInfoBox;
        },

        group() {
            return (this.monitor.path || []).slice(0, -1).join(" / ");
        },

        pushURL() {
            return this.$root.baseURL + "/api/push/" + this.monitor.pushToken + "?status=up&msg=OK&ping=";
        },

        screenshotURL() {
            return getResBaseURL() + this.monitor.screenshot + "?time=" + this.cacheTime;
        },

        isUrlType() {
            return URL_TYPES.includes(this.monitor.type);
        },

        /**
         * What is checked, for types that are not a plain URL
         * @returns {string} Host, address or connection
         */
        target() {
            const m = this.monitor;
            switch (m.type) {
                case "port":
                case "steam":
                    return `${m.hostname}:${m.port}`;
                case "gamedig":
                    return `${m.game}: ${m.hostname}:${m.port}`;
                case "dns":
                    return `[${m.dns_resolve_type}] ${m.hostname}`;
                case "docker":
                    return m.docker_container;
                case "grpc-keyword":
                    return this.filterPassword(m.grpcUrl);
                case "mqtt":
                    return `${m.hostname}:${m.port}/${m.mqttTopic}`;
                case "radius":
                    return this.filterPassword(m.hostname);
                case "oracledb":
                    return this.$t("oracledbConnectionString", {
                        connectionString: this.filterPassword(m.databaseConnectionString),
                    });
                case "mongodb":
                case "mysql":
                case "postgres":
                case "redis":
                case "sqlserver":
                    return this.filterPassword(m.databaseConnectionString);
                case "globalping":
                    return m.subtype === "http" ? this.filterPassword(m.url) : m.hostname;
                case "push":
                case "group":
                    return "";
                default:
                    return m.hostname ?? "";
            }
        },

        /**
         * Second grey line: keyword, query or last DNS result
         * @returns {string} Detail, or empty
         */
        targetDetail() {
            const m = this.monitor;
            const parts = [];
            if (m.type === "keyword" || m.type === "grpc-keyword") {
                parts.push(`${this.$t("Keyword")}: ${m.keyword}`);
                if (m.invertKeyword) {
                    parts.push(this.$t("Invert Keyword"));
                }
            }
            if (m.type === "json-query") {
                parts.push(`${this.$t("Json Query")}: ${m.jsonPath}`);
                parts.push(`${this.$t("Expected Value")}: ${m.expectedValue}`);
            }
            if (m.type === "globalping") {
                parts.push(`${this.$t("Location")}: ${m.location}`);
            }
            if (m.type === "dns" || (m.type === "globalping" && m.subtype === "dns")) {
                parts.push(`${this.$t("Last Result")}: ${m.dns_last_result}`);
            }
            return parts.join(" · ");
        },

        interval() {
            return shortInterval(this.monitor.interval);
        },

        checkLine() {
            if (this.monitor.type === "group") {
                return this.$t("groupOfMonitors", [this.children.length]);
            }
            return `${monitorTypeLabel(this.monitor)} · ${this.$t("everyInterval", [this.interval])}`;
        },

        state() {
            return monitorState(this.monitor, this.$root.lastHeartbeatList[this.monitor.id], this.$t);
        },

        /**
         * First fact: how long the monitor has been in its state, or the state itself
         * @returns {{label: string, value: string, tone: string}} Fact
         */
        stateFact() {
            const since = this.$root.statusSince[this.monitor.id];
            const labels = {
                up: "Currently up for",
                down: "Currently down for",
                pending: "Pending for",
                maintenance: "In maintenance for",
            };
            // Only the value carries the status colour; paused reads as amber like pending
            const tone =
                { up: "s-up", down: "s-down", pending: "s-pending", maintenance: "s-maintenance", paused: "s-pending" }[
                    this.state.key
                ] ?? "";
            if (since && labels[this.state.key]) {
                return {
                    label: this.$t(labels[this.state.key]),
                    value: shortDuration((this.now - dayjs.utc(since)) / 1000),
                    tone,
                };
            }
            return { label: this.$t("Status"), value: this.state.label, tone };
        },

        lastCheck() {
            if (!this.lastHeartBeat.time) {
                return "—";
            }
            const seconds = Math.max(0, Math.round((this.now - dayjs.utc(this.lastHeartBeat.time)) / 1000));
            return this.$t("time ago", [seconds < 60 ? `${seconds} s` : shortDuration(seconds)]);
        },

        /**
         * Whether this kind of monitor measures a response time at all
         * @returns {boolean} Has response times
         */
        hasResponseTimes() {
            return this.monitor.type !== "push" && this.monitor.type !== "group";
        },

        children() {
            return Object.values(this.$root.monitorList)
                .filter((m) => m.parent === this.monitor.id)
                .sort((a, b) => a.name.localeCompare(b.name));
        },

        pushLanguages() {
            return {
                "bash-curl": "curl",
                python: "Python",
                "javascript-fetch": "Node",
                "typescript-fetch": "TypeScript",
                powershell: "PowerShell",
                go: "Go",
                php: "PHP",
                java: "Java",
                csharp: "C#",
                docker: "Docker",
            };
        },

        /**
         * Down spans from the important heartbeats, oldest first
         * @returns {Array<{start: number, end: number}>} Spans in milliseconds
         */
        incidents() {
            const spans = [];
            let start = null;
            const beats = [...this.incidentBeats].reverse();
            for (const beat of beats) {
                const time = dayjs.utc(beat.time).valueOf();
                if (beat.status === DOWN && start === null) {
                    start = time;
                } else if (beat.status !== DOWN && start !== null) {
                    spans.push({ start, end: time });
                    start = null;
                }
            }
            if (start !== null) {
                spans.push({ start, end: this.now });
            }
            return spans;
        },

        /**
         * Availability and incidents for the last day, week and month
         * @returns {Array<object>} Table rows
         */
        periodRows() {
            const periods = [
                {
                    label: this.$t("Last 24 hours"),
                    seconds: DAY,
                    uptime: this.$root.uptimeList[`${this.monitor.id}_24`],
                },
                { label: this.$t("Last 7 days"), seconds: 7 * DAY, uptime: this.weekAvailability },
                {
                    label: this.$t("Last 30 days"),
                    seconds: 30 * DAY,
                    uptime: this.$root.uptimeList[`${this.monitor.id}_720`],
                },
            ];
            return periods.map((period) => {
                const from = this.now - period.seconds * 1000;
                const durations = this.incidents
                    .filter((span) => span.end > from)
                    .map((span) => (span.end - Math.max(span.start, from)) / 1000);
                const total = durations.reduce((a, b) => a + b, 0);
                const none = durations.length === 0;
                return {
                    label: period.label,
                    availability: formatUptime(period.uptime),
                    downtime: none ? this.$t("none") : shortDuration(total),
                    incidents: durations.length,
                    longest: none ? "—" : shortDuration(Math.max(...durations)),
                    average: none ? "—" : shortDuration(total / durations.length),
                };
            });
        },

        descriptionHTML() {
            if (this.monitor.description != null) {
                return DOMPurify.sanitize(marked(this.monitor.description));
            } else {
                return "";
            }
        },
    },

    watch: {
        page(to) {
            this.getImportantHeartbeatListPaged();
        },

        "$route.params.id"(id) {
            this.fetchMonitor(id);
        },

        monitor(to, from) {
            this.getImportantHeartbeatListLength();
            if (to && !from) {
                this.loadIncidents();
            }
        },
        "monitor.type"() {
            if (this.monitor && this.monitor.type === "push") {
                this.loadPushExample();
            }
        },
        "pushMonitor.currentExample"() {
            this.loadPushExample();
        },
    },

    mounted() {
        this.getImportantHeartbeatListLength();
        this.fetchMonitor(this.$route.params.id);
        this.$root.loadStatusSince();
        this.loadIncidents();
        this.ticker = setInterval(() => {
            this.now = Date.now();
        }, 10000);

        this.$root.emitter.on("newImportantHeartbeat", this.onNewImportantHeartbeat);

        if (this.monitor && this.monitor.type === "push") {
            if (this.lastHeartBeat.status === -1) {
                this.pushMonitor.showPushExamples = true;
            }
            this.loadPushExample();
        }
    },

    beforeUnmount() {
        this.$root.emitter.off("newImportantHeartbeat", this.onNewImportantHeartbeat);
        clearInterval(this.ticker);
    },

    methods: {
        getResBaseURL,
        /**
         * Load the full monitor for this page. The dashboard list is a summary only.
         * @param {string} id Monitor id
         * @returns {void}
         */
        fetchMonitor(id) {
            this.fetchedMonitor = null;
            const socket = this.$root.getSocket();
            if (!socket) {
                // Deep links mount this page before the root initializes the socket
                setTimeout(() => this.fetchMonitor(id), 250);
                return;
            }
            socket.emit("getMonitor", id, (res) => {
                if (res.ok && this.$route.params.id === id) {
                    this.fetchedMonitor = res.monitor;
                }
            });
        },
        /**
         * Request a test notification be sent for this monitor
         * @returns {void}
         */
        testNotification() {
            this.$root.getSocket().emit("testNotification", this.monitor.id);
            this.$root.toastSuccess("Test notification is requested.");
        },

        /**
         * Show dialog to confirm pause
         * @returns {void}
         */
        pauseDialog() {
            this.$refs.confirmPause.show();
        },

        /**
         * Resume this monitor
         * @returns {void}
         */
        resumeMonitor() {
            this.$root.getSocket().emit("resumeMonitor", this.monitor.id, (res) => {
                if (res.ok) {
                    this.setFetchedMonitorActive(true);
                }
                this.$root.toastRes(res);
            });
        },

        /**
         * Request that this monitor is paused
         * @returns {void}
         */
        pauseMonitor() {
            this.$root.getSocket().emit("pauseMonitor", this.monitor.id, (res) => {
                if (res.ok) {
                    this.setFetchedMonitorActive(false);
                }
                this.$root.toastRes(res);
            });
        },

        /**
         * Keep the fetched (full) monitor in sync with an active-state change.
         * The dashboard list is a summary, so this page keeps its own copy.
         * @param {boolean} active New active state
         * @returns {void}
         */
        setFetchedMonitorActive(active) {
            if (this.fetchedMonitor) {
                this.fetchedMonitor.active = active;
            }
        },

        /**
         * Show dialog to confirm deletion
         * @returns {void}
         */
        deleteDialog() {
            this.$refs.confirmDelete.show();
        },

        /**
         * Show Screenshot Dialog
         * @returns {void}
         */
        showScreenshotDialog() {
            this.$refs.screenshotDialog.show();
        },

        /**
         * Show dialog to confirm clearing events
         * @returns {void}
         */
        clearEventsDialog() {
            this.$refs.confirmClearEvents.show();
        },

        /**
         * Show dialog to confirm clearing heartbeats
         * @returns {void}
         */
        clearHeartbeatsDialog() {
            this.$refs.confirmClearHeartbeats.show();
        },

        /**
         * Request that this monitor is deleted
         * @returns {void}
         */
        deleteMonitor() {
            this.$root.deleteMonitor(this.monitor.id, this.deleteChildrenMonitors, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.$router.push("/dashboard");
                }
            });
        },

        /**
         * Request that this monitors events are cleared
         * @returns {void}
         */
        clearEvents() {
            this.$root.clearEvents(this.monitor.id, (res) => {
                if (res.ok) {
                    this.getImportantHeartbeatListLength();
                } else {
                    toast.error(res.msg);
                }
            });
        },

        /**
         * Request that this monitors heartbeats are cleared
         * @returns {void}
         */
        clearHeartbeats() {
            this.$root.clearHeartbeats(this.monitor.id, (res) => {
                if (!res.ok) {
                    toast.error(res.msg);
                }
            });
        },

        /**
         * Get URL of monitor
         * @param {number} id ID of monitor
         * @returns {string} Relative URL of monitor
         */
        monitorURL(id) {
            return getMonitorRelativeURL(id);
        },

        /**
         * Filter and hide password in URL for display
         * @param {string} urlString URL to censor
         * @returns {string} Censored URL
         */
        filterPassword(urlString) {
            try {
                let parsedUrl = new URL(urlString);
                if (parsedUrl.password !== "") {
                    parsedUrl.password = "******";
                }
                return parsedUrl.toString();
            } catch (e) {
                // Handle SQL Server
                return urlString.replaceAll(/Password=(.+);/gi, "Password=******;");
            }
        },

        /**
         * Retrieves the length of the important heartbeat list for this monitor.
         * @returns {void}
         */
        getImportantHeartbeatListLength() {
            if (this.monitor) {
                this.$root.getSocket().emit("monitorImportantHeartbeatListCount", this.monitor.id, (res) => {
                    if (res.ok) {
                        this.importantHeartBeatListLength = res.count;
                        this.getImportantHeartbeatListPaged();
                    }
                });
            }
        },

        /**
         * Retrieves the important heartbeat list for the current page.
         * @returns {void}
         */
        getImportantHeartbeatListPaged() {
            if (this.monitor) {
                const offset = (this.page - 1) * this.perPage;
                this.$root
                    .getSocket()
                    .emit("monitorImportantHeartbeatListPaged", this.monitor.id, offset, this.perPage, (res) => {
                        if (res.ok) {
                            this.displayedRecords = res.data;
                        }
                    });
            }
        },

        /**
         * Updates the displayed records when a new important heartbeat arrives.
         * @param {object} heartbeat - The heartbeat object received.
         * @returns {void}
         */
        onNewImportantHeartbeat(heartbeat) {
            if (heartbeat.monitorID === this.monitor?.id) {
                if (this.page === 1) {
                    this.displayedRecords.unshift(heartbeat);
                    if (this.displayedRecords.length > this.perPage) {
                        this.displayedRecords.pop();
                    }
                    this.importantHeartBeatListLength += 1;
                }
            }
        },

        /**
         * Highlight the example code
         * @param {string} code Code
         * @returns {string} Highlighted code
         */
        pushExampleHighlighter(code) {
            return highlight(code, languages.js);
        },

        loadPushExample() {
            this.pushMonitor.code = "";
            this.$root.getSocket().emit("getPushExample", this.pushMonitor.currentExample, (res) => {
                let code = res.code
                    .replace("60", this.monitor.interval)
                    .replace("https://example.com/api/push/key?status=up&msg=OK&ping=", this.pushURL);
                this.pushMonitor.code = code;
            });
        },

        formatUptime,
        monitorTypeLabel,
        shortTime,

        msText(value) {
            return value == null ? "—" : `${Math.round(value)} ms`;
        },

        uptimeText(period) {
            if (this.state.key === "wait") {
                return "—";
            }
            return formatUptime(this.$root.uptimeList[`${this.monitor.id}_${period}`]);
        },

        childState(child) {
            return monitorState(child, this.$root.lastHeartbeatList[child.id], this.$t);
        },

        statusKey(status) {
            return { [UP]: "up", [DOWN]: "down", [PENDING]: "pending", [MAINTENANCE]: "maintenance" }[status] ?? "wait";
        },

        statusWord(status) {
            const words = { [UP]: "Up", [DOWN]: "Down", [PENDING]: "Pending", [MAINTENANCE]: "statusMaintenance" };
            return this.$t(words[status] ?? "Unknown");
        },

        selectAll(event) {
            event.target.select();
        },

        /**
         * Copy text and say so on the button for a moment
         * @param {string} text Text to copy
         * @param {string} what Which button was used
         * @returns {Promise<void>}
         */
        async copy(text, what) {
            await navigator.clipboard.writeText(text);
            this.copied = what;
            setTimeout(() => {
                this.copied = null;
            }, 1500);
        },

        /**
         * Load the important heartbeats and the 7-day availability for the period table
         * @returns {void}
         */
        loadIncidents() {
            if (!this.monitor) {
                return;
            }
            const socket = this.$root.getSocket();
            socket.emit("monitorImportantHeartbeatListPaged", this.monitor.id, 0, 500, (res) => {
                if (res.ok) {
                    this.incidentBeats = res.data;
                }
            });
            this.$root.getMonitorChartData(this.monitor.id, 7 * 24, (res) => {
                if (!res.ok) {
                    return;
                }
                const up = res.data.reduce((sum, point) => sum + point.up, 0);
                const down = res.data.reduce((sum, point) => sum + point.down, 0);
                this.weekAvailability = up + down > 0 ? up / (up + down) : null;
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.form-check {
    margin-top: 16px;
}
</style>
