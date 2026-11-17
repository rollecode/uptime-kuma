<template>
    <div>
        <div
            class="draggable-item"
            :style="depthMargin"
            :class="{ 'drag-over': dragOverCount > 0 }"
            @dragstart="onDragStart"
            @dragenter.prevent="onDragEnter"
            @dragleave.prevent="onDragLeave"
            @dragover.prevent
            @drop.prevent="onDrop"
        >
            <!-- Group header -->
            <div v-if="monitor.type === 'group'" class="carbon-group">
                <input
                    v-if="isSelectMode"
                    class="form-check-input"
                    type="checkbox"
                    :data-testid="'monitor-select-' + monitor.id"
                    :aria-label="$t('Check/Uncheck')"
                    :checked="isSelected(monitor.id)"
                    @click.stop="toggleSelection"
                />
                <button
                    type="button"
                    class="carbon-group-toggle"
                    data-testid="monitor-collapse"
                    :aria-expanded="!isCollapsed"
                    :aria-label="monitor.name"
                    @click="changeCollapsed"
                >
                    <svg
                        aria-hidden="true"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        class="animated"
                        :class="{ collapsed: isCollapsed }"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>
                <router-link :to="monitorURL(monitor.id)" class="carbon-group-name">{{ monitor.name }}</router-link>
                <span class="count">{{ sortedChildMonitorList.length }}</span>
            </div>

            <!-- Monitor row -->
            <div
                v-else
                class="carbon-row"
                :class="{
                    disabled: !monitor.active,
                    'is-selecting': isSelectMode,
                    'is-selected': isSelected(monitor.id),
                }"
            >
                <span class="carbon-dot-cell">
                    <span class="carbon-dot" :class="state.key" aria-hidden="true"><i /></span>
                    <input
                        class="form-check-input carbon-row-check"
                        type="checkbox"
                        :data-testid="'monitor-select-' + monitor.id"
                        :aria-label="$t('Check/Uncheck')"
                        :checked="isSelected(monitor.id)"
                        @click.stop="toggleSelection"
                    />
                </span>
                <div class="carbon-name">
                    <router-link :to="monitorURL(monitor.id)" class="nm stretched-link">{{ monitor.name }}</router-link>
                    <div class="sub">
                        <span :class="`s-${state.key}`">{{ state.label }}</span>
                        {{ details }}
                    </div>
                    <div v-if="monitor.tags.length > 0" class="tags">
                        <Tag v-for="tag in monitor.tags" :key="tag" :item="tag" :size="'sm'" :title="tag.name" />
                    </div>
                </div>
                <div v-if="$root.userHeartbeatBar !== 'none'" class="carbon-bars">
                    <HeartbeatBar ref="heartbeatBar" size="small" :monitor-id="monitor.id" />
                </div>
                <span class="num" :title="$t('uptime24h')">{{ uptime }}</span>
                <span class="mut" :title="$t('Avg. Response')">{{ ping }}</span>
                <span class="mut every">{{ every }}</span>
                <div class="dropdown carbon-kebab">
                    <button
                        type="button"
                        class="carbon-kebab-btn"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        :aria-label="$t('Actions')"
                    >
                        ···
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <router-link :to="`/edit/${monitor.id}`" class="dropdown-item">
                                {{ $t("Edit") }}
                            </router-link>
                        </li>
                        <li>
                            <router-link :to="`/clone/${monitor.id}`" class="dropdown-item">
                                {{ $t("Clone") }}
                            </router-link>
                        </li>
                        <li v-if="monitor.active">
                            <button type="button" class="dropdown-item" @click="pause(monitor.id)">
                                {{ $t("Pause") }}
                            </button>
                        </li>
                        <li v-else>
                            <button type="button" class="dropdown-item" @click="resume">{{ $t("Resume") }}</button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <div v-if="!isCollapsed" class="childs">
            <MonitorListItem
                v-for="(item, index) in sortedChildMonitorList"
                :key="index"
                :monitor="item"
                :children-by-parent="childrenByParent"
                :isSelectMode="isSelectMode"
                :isSelected="isSelected"
                :select="select"
                :deselect="deselect"
                :pause="pause"
                :depth="depth + 1"
                :filter-func="filterFunc"
                :sort-func="sortFunc"
            />
        </div>
    </div>
</template>

<script>
import dayjs from "dayjs";
import HeartbeatBar from "../components/HeartbeatBar.vue";
import Tag from "../components/Tag.vue";
import { getMonitorRelativeURL } from "../util.ts";
import { formatUptime, monitorState, monitorTypeLabel, shortDuration, shortInterval } from "../util-frontend";

export default {
    name: "MonitorListItem",
    components: {
        HeartbeatBar,
        Tag,
    },
    props: {
        /** Parent id -> children index, shared by the whole list */
        childrenByParent: {
            type: Map,
            default: () => new Map(),
        },
        /** Monitor this represents */
        monitor: {
            type: Object,
            default: null,
        },
        /** If the user is in select mode */
        isSelectMode: {
            type: Boolean,
            default: false,
        },
        /** How many ancestors are above this monitor */
        depth: {
            type: Number,
            default: 0,
        },
        /** Callback to determine if monitor is selected */
        isSelected: {
            type: Function,
            default: () => {},
        },
        /** Callback fired when monitor is selected */
        select: {
            type: Function,
            default: () => {},
        },
        /** Callback fired when monitor is deselected */
        deselect: {
            type: Function,
            default: () => {},
        },
        /** Callback fired when the monitor should be paused */
        pause: {
            type: Function,
            default: () => {},
        },
        /** Function to filter child monitors */
        filterFunc: {
            type: Function,
            default: () => {},
        },
        /** Function to sort child monitors */
        sortFunc: {
            type: Function,
            default: () => {},
        },
    },
    data() {
        return {
            isCollapsed: false,
            dragOverCount: 0,
        };
    },
    computed: {
        sortedChildMonitorList() {
            let result = this.childrenByParent.get(this.monitor.id) ?? [];

            // Run filter on children
            result = result.filter(this.filterFunc);

            result.sort(this.sortFunc);

            return result;
        },
        hasChildren() {
            return this.sortedChildMonitorList.length > 0;
        },
        depthMargin() {
            return {
                marginLeft: `${20 * Math.max(0, this.depth - 1)}px`,
            };
        },
        /**
         * Current state: a key for the colour and a label for people
         * @returns {object} Key and label
         */
        state() {
            return monitorState(this.monitor, this.$root.lastHeartbeatList[this.monitor.id], this.$t);
        },

        /**
         * Grey details after the state: how long, what kind of check, how often
         * @returns {string} Details, each after a middle dot
         */
        details() {
            const parts = [];
            const since = this.$root.statusSince[this.monitor.id];
            if (since && this.state.key !== "wait") {
                parts.push(shortDuration(dayjs().diff(dayjs.utc(since), "second")));
            }
            parts.push(monitorTypeLabel(this.monitor));
            parts.push(this.$t("everyInterval", [this.every]));
            return parts.map((part) => ` · ${part}`).join("");
        },

        uptime() {
            if (this.state.key === "wait") {
                return "—";
            }
            return formatUptime(this.$root.uptimeList[`${this.monitor.id}_24`]);
        },

        ping() {
            const value = this.$root.avgPingList[this.monitor.id];
            return value == null ? "—" : `${Math.round(value)} ms`;
        },

        every() {
            return shortInterval(this.monitor.interval);
        },
    },
    watch: {
        isSelectMode() {
            // TODO: Resize the heartbeat bar, but too slow
            // this.$refs.heartbeatBar.resize();
        },
    },
    beforeMount() {
        // Always unfold if monitor is accessed directly
        if (this.monitor.childrenIDs.includes(parseInt(this.$route.params.id))) {
            this.isCollapsed = false;
            return;
        }

        // Set collapsed value based on local storage
        let storage = window.localStorage.getItem("monitorCollapsed");
        if (storage === null) {
            return;
        }

        let storageObject = JSON.parse(storage);
        if (storageObject[`monitor_${this.monitor.id}`] == null) {
            return;
        }

        this.isCollapsed = storageObject[`monitor_${this.monitor.id}`];
    },
    methods: {
        /**
         * Changes the collapsed value of the current monitor and saves
         * it to local storage
         * @returns {void}
         */
        changeCollapsed() {
            this.isCollapsed = !this.isCollapsed;

            // Save collapsed value into local storage
            let storage = window.localStorage.getItem("monitorCollapsed");
            let storageObject = {};
            if (storage !== null) {
                storageObject = JSON.parse(storage);
            }
            storageObject[`monitor_${this.monitor.id}`] = this.isCollapsed;

            window.localStorage.setItem("monitorCollapsed", JSON.stringify(storageObject));
        },
        /**
         * Initializes the drag operation if the monitor is draggable.
         * @param {DragEvent} event - The dragstart event triggered by the browser.
         * @returns {void} This method does not return anything.
         */
        onDragStart(event) {
            try {
                event.dataTransfer.setData("text/monitor-id", String(this.monitor.id));
                event.dataTransfer.effectAllowed = "move";
            } catch (e) {
                // ignore
            }
        },

        onDragEnter(event) {
            if (this.monitor.type !== "group") {
                return;
            }

            this.dragOverCount++;
        },

        onDragLeave(event) {
            if (this.monitor.type !== "group") {
                return;
            }

            this.dragOverCount = Math.max(0, this.dragOverCount - 1);
        },

        async onDrop(event) {
            this.dragOverCount = 0;

            // Only groups accept drops
            if (this.monitor.type !== "group") {
                return;
            }

            const draggedId = event.dataTransfer.getData("text/monitor-id");
            if (!draggedId) {
                return;
            }

            const draggedMonitorId = parseInt(draggedId);
            if (isNaN(draggedMonitorId) || draggedMonitorId === this.monitor.id) {
                return;
            }

            const draggedMonitor = this.$root.monitorList[draggedMonitorId];
            if (!draggedMonitor) {
                return;
            }

            const parentId = this.monitor.id;
            if (draggedMonitor.parent === parentId) {
                return;
            }

            // Never move a group into itself or one of its descendants
            let ancestorId = parentId;
            while (ancestorId != null) {
                if (ancestorId === draggedMonitorId) {
                    this.$root.toastError("Cannot move a group into its own subgroup");
                    return;
                }
                ancestorId = this.$root.monitorList[ancestorId]?.parent ?? null;
            }

            // Save original parent so we can revert locally if server returns error
            const originalParent = draggedMonitor.parent;
            const revert = () => {
                if (this.$root.monitorList[draggedMonitorId]) {
                    this.$root.monitorList[draggedMonitorId].parent = originalParent;
                }
            };

            // Optimistically update local state so UI updates immediately
            this.$root.monitorList[draggedMonitorId].parent = parentId;

            // The dashboard list only holds summary fields, so load the full monitor first:
            // saving the summary would clear the monitor's other settings
            this.$root.getSocket().emit("getMonitor", draggedMonitorId, (res) => {
                if (!res || !res.ok) {
                    revert();
                    return;
                }

                const monitorToSave = res.monitor;
                monitorToSave.parent = parentId;

                try {
                    this.$root.getSocket().emit("editMonitor", monitorToSave, (saveRes) => {
                        if (!saveRes || !saveRes.ok) {
                            revert();
                            if (saveRes && saveRes.msg) {
                                this.$root.toastError(saveRes.msg);
                            }
                        } else {
                            this.$root.toastRes(saveRes);
                        }
                    });
                } catch (e) {
                    revert();
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
         * Resume checking this monitor
         * @returns {void}
         */
        resume() {
            this.$root.getSocket().emit("resumeMonitor", this.monitor.id, (res) => this.$root.toastRes(res));
        },
        /**
         * Toggle selection of monitor
         * @returns {void}
         */
        toggleSelection() {
            if (this.isSelected(this.monitor.id)) {
                this.deselect(this.monitor.id);
            } else {
                this.select(this.monitor.id);
            }
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../assets/vars.scss";

.collapsed {
    transform: rotate(-90deg);
}

.draggable-item {
    cursor: grab;
    position: relative;
}
</style>
