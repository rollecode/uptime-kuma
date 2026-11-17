<template>
    <div class="carbon-monitors">
        <div class="carbon-top">
            <div class="carbon-title">
                <h1>{{ $t("navMonitors") }}</h1>
                <StatusFinding />
            </div>
            <div class="carbon-tools">
                <form class="carbon-search" role="search" @submit.prevent>
                    <svg
                        aria-hidden="true"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5" />
                    </svg>
                    <input
                        v-model="searchText"
                        class="search-input"
                        data-testid="monitor-search"
                        :placeholder="$t('Search...')"
                        :aria-label="$t('Search monitored sites')"
                        autocomplete="off"
                    />
                    <button
                        v-if="searchText != ''"
                        type="button"
                        class="search-icon"
                        :aria-label="$t('Clear')"
                        @click="clearSearchText"
                    >
                        <font-awesome-icon icon="times" />
                    </button>
                </form>
                <router-link to="/add" class="btn btn-primary">{{ $t("newMonitor") }}</router-link>
            </div>
        </div>

        <div v-if="!selectMode" class="carbon-tabs">
            <button
                v-for="t in tabs"
                :key="t.key"
                type="button"
                class="carbon-tab"
                :class="{ 'is-on': tab === t.key }"
                :aria-pressed="tab === t.key"
                @click="tab = t.key"
            >
                {{ t.label }}
                <span>{{ t.count }}</span>
            </button>

            <span v-for="chip in filterChips" :key="chip.key" class="carbon-chip carbon-filter-chip">
                {{ chip.label }}
                <button type="button" :aria-label="$t('Remove filter')" @click="clearFilter(chip.key)">×</button>
            </span>

            <div class="filters-group">
                <button type="button" class="carbon-tool" data-testid="select-mode-toggle" @click="selectMode = true">
                    {{ $t("Select") }}
                </button>
                <MonitorListFilter
                    :filterState="filterState"
                    :allCollapsed="allGroupsCollapsed"
                    :hasGroups="groupMonitors.length >= 2"
                    @update-filter="updateFilter"
                    @toggle-collapse-all="toggleCollapseAll"
                />
            </div>
        </div>

        <!-- Select mode replaces the toolbar -->
        <div v-else class="carbon-tabs carbon-selectbar">
            <span class="count">{{ $t("selectedCount", [selectedMonitorCount]) }}</span>
            <button type="button" class="carbon-tool" data-testid="select-all-toggle" @click="toggleSelectAll">
                {{ selectAll ? $t("Deselect All") : $t("selectAllCount", [selectableMonitors.length]) }}
            </button>
            <template v-if="selectedMonitorCount > 0">
                <button
                    type="button"
                    class="carbon-tool"
                    data-testid="bulk-pause"
                    :disabled="bulkActionInProgress"
                    @click="pauseDialog"
                >
                    {{ $t("Pause") }}
                </button>
                <button
                    type="button"
                    class="carbon-tool"
                    data-testid="bulk-resume"
                    :disabled="bulkActionInProgress"
                    @click="resumeSelected"
                >
                    {{ $t("Resume") }}
                </button>
                <button
                    type="button"
                    class="carbon-tool carbon-tool-danger"
                    data-testid="bulk-delete"
                    :disabled="bulkActionInProgress"
                    @click="$refs.confirmDelete.show()"
                >
                    {{ $t("Delete") }}
                </button>
            </template>
            <button type="button" class="carbon-quiet ms-auto" @click="cancelSelectMode">{{ $t("Cancel") }}</button>
        </div>

        <div ref="monitorList" class="monitor-list" data-testid="monitor-list">
            <div v-if="!$root.monitorListLoaded" class="list-loading" aria-busy="true">
                <div v-for="i in 8" :key="i" class="skeleton-row"></div>
            </div>
            <EmptyState
                v-else-if="Object.keys($root.monitorList).length === 0"
                illustration="clockwork"
                :title="$t('No monitors yet')"
                class="mt-4"
            >
                {{ $t("noMonitorsHelp") }}
                <template #action>
                    <router-link to="/add" class="btn btn-normal">{{ $t("newMonitor") }}</router-link>
                </template>
            </EmptyState>
            <EmptyState
                v-else-if="sortedMonitorList.length === 0 && searchText !== ''"
                illustration="telescope"
                :title="$t('noSearchResults', [searchText])"
                class="mt-4"
            >
                {{ $t("noSearchResultsHelp") }}
            </EmptyState>
            <EmptyState
                v-else-if="sortedMonitorList.length === 0"
                illustration="anchor"
                :title="$t('Nothing here')"
                class="mt-4"
            >
                {{ $t("emptyTabHelp") }}
            </EmptyState>

            <div :style="{ height: renderedRows.top + 'px' }"></div>
            <MonitorListItem
                v-for="item in renderedRows.items"
                :key="`${item.id}-${collapseKey}`"
                :ref="(el) => setRowRef(el, item.id)"
                :monitor="item"
                :children-by-parent="childrenByParent"
                :isSelectMode="selectMode"
                :isSelected="isSelected"
                :select="select"
                :deselect="deselect"
                :pause="pauseOne"
                :filter-func="filterFunc"
                :sort-func="sortFunc"
            />
            <div :style="{ height: renderedRows.bottom + 'px' }"></div>
        </div>
    </div>

    <Confirm ref="confirmPause" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="onPauseConfirmed">
        {{ $t("pauseMonitorMsg") }}
    </Confirm>

    <Confirm ref="confirmDelete" btn-style="btn-danger" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="deleteSelected">
        {{ $t("deleteMonitorsMsg") }}
    </Confirm>
</template>

<script>
import Confirm from "../components/Confirm.vue";
import MonitorListItem from "../components/MonitorListItem.vue";
import MonitorListFilter from "./MonitorListFilter.vue";
import StatusFinding from "./StatusFinding.vue";
import EmptyState from "./EmptyState.vue";
import { computeListWindow, computeRowMetrics } from "../monitor-list-window";
import { getMonitorRelativeURL, DOWN } from "../util.ts";

export default {
    components: {
        Confirm,
        MonitorListItem,
        MonitorListFilter,
        StatusFinding,
        EmptyState,
    },
    data() {
        return {
            searchText: "",
            tab: "all",
            pauseId: null,
            selectMode: false,
            selectAll: false,
            disableSelectAllWatcher: false,
            selectedMonitors: {},
            bulkActionInProgress: false,
            filterState: {
                status: null,
                active: null,
                tags: null,
            },
            collapseKey: 0,
            scrollTop: 0,
            viewportHeight: 0,
            rowHeights: {},
        };
    },
    computed: {
        /**
         * Groups all monitors by parent id in a single pass so rows never scan the full list.
         * @returns {Map<number|null, Array>} Parent id -> direct children
         */
        childrenByParent() {
            const map = new Map();
            for (const monitor of Object.values(this.$root.monitorList)) {
                const key = monitor.parent ?? null;
                let children = map.get(key);
                if (!children) {
                    children = [];
                    map.set(key, children);
                }
                children.push(monitor);
            }
            return map;
        },

        /**
         * Row offsets and heights for the windowed list.
         * @returns {{heights: number[], offsets: number[], total: number}} Layout data
         */
        rowMetrics() {
            const ids = this.sortedMonitorList.map((monitor) => monitor.id);
            return computeRowMetrics(ids, this.rowHeights);
        },

        /**
         * Only the rows inside (and slightly around) the viewport, plus spacer sizes.
         * This keeps the DOM at ~50 rows no matter how many monitors exist.
         * @returns {{items: Array, top: number, bottom: number}} Visible slice and spacers
         */
        renderedRows() {
            const list = this.sortedMonitorList;
            const { heights, offsets, total } = this.rowMetrics;
            const window = computeListWindow(offsets, heights, total, this.scrollTop, this.viewportHeight);

            return {
                items: list.slice(window.start, window.end),
                top: window.top,
                bottom: window.bottom,
            };
        },

        /**
         * Returns a sorted list of monitors based on the applied filters and search text.
         * @returns {Array} The sorted list of monitors.
         */
        sortedMonitorList() {
            let result = this.childrenByParent.get(null) ?? [];

            result = result.filter(this.filterFunc);

            // Monitors outside any group first, then the groups
            result.sort((m1, m2) => (m1.type === "group") - (m2.type === "group") || this.sortFunc(m1, m2));

            return result;
        },

        /**
         * Tabs above the list, each with how many monitors it holds
         * @returns {Array} Tab keys, labels and counts
         */
        tabs() {
            const monitors = Object.values(this.$root.monitorList).filter((m) => m.type !== "group");
            const summary = this.$root.checkSummary;
            return [
                { key: "all", label: this.$t("tabAll"), count: summary.total },
                { key: "down", label: this.$t("Down"), count: summary.down },
                { key: "push", label: this.$t("Heartbeats"), count: monitors.filter((m) => m.type === "push").length },
                { key: "paused", label: this.$t("filterActivePaused"), count: summary.paused },
            ];
        },

        /**
         * Monitors that "Select all" picks: every check shown, groups left out
         * @returns {Array} Monitors
         */
        selectableMonitors() {
            return Object.values(this.$root.monitorList).filter((m) => m.type !== "group" && this.filterFunc(m));
        },

        /**
         * Active filters as removable chips, e.g. "Status: Down"
         * @returns {Array<{key: string, label: string}>} Chips
         */
        filterChips() {
            const chips = [];
            const words = { 0: "Down", 1: "Up", 2: "Pending", 3: "statusMaintenance" };
            const status = this.filterState.status ?? [];
            if (status.length > 0) {
                const value = status.length === 1 ? this.$t(words[status[0]]) : status.length;
                chips.push({ key: "status", label: `${this.$t("Status")}: ${value}` });
            }
            const active = this.filterState.active ?? [];
            if (active.length > 0) {
                const value =
                    active.length === 1 ? this.$t(active[0] ? "Active" : "filterActivePaused") : active.length;
                chips.push({ key: "active", label: `${this.$t("State")}: ${value}` });
            }
            const tags = this.filterState.tags ?? [];
            if (tags.length > 0) {
                chips.push({ key: "tags", label: `${this.$t("Tags")}: ${tags.length}` });
            }
            return chips;
        },

        isDarkTheme() {
            return document.body.classList.contains("dark");
        },

        selectedMonitorCount() {
            return Object.keys(this.selectedMonitors).length;
        },

        /**
         * Determines if any filters are active.
         * @returns {boolean} True if any filter is active, false otherwise.
         */
        filtersActive() {
            return (
                this.tab !== "all" ||
                this.filterState.status != null ||
                this.filterState.active != null ||
                this.filterState.tags != null ||
                this.searchText !== ""
            );
        },

        /**
         * Gets all group monitors that have children at any nesting level
         * @returns {Array} Array of group monitors with children
         */
        groupMonitors() {
            return (this.childrenByParent.get(null) ?? []).filter(
                (m) => m.type === "group" && (this.childrenByParent.get(m.id)?.length ?? 0) > 0
            );
        },

        /**
         * Determines if all groups are collapsed.
         * Note: collapseKey is included to force re-computation when toggleCollapseAll()
         * updates localStorage, since Vue cannot detect localStorage changes.
         * @returns {boolean} True if all groups are collapsed
         */
        allGroupsCollapsed() {
            // collapseKey forces this computed to re-evaluate after localStorage updates
            if (this.collapseKey < 0 || this.groupMonitors.length === 0) {
                return false;
            }

            const storage = window.localStorage.getItem("monitorCollapsed");
            if (storage === null) {
                return false; // Default is expanded
            }

            const storageObject = JSON.parse(storage);
            return this.groupMonitors.every((group) => storageObject[`monitor_${group.id}`] === true);
        },
    },
    watch: {
        searchText() {
            for (let monitor of this.sortedMonitorList) {
                if (!this.selectedMonitors[monitor.id]) {
                    if (this.selectAll) {
                        this.disableSelectAllWatcher = true;
                        this.selectAll = false;
                    }
                    break;
                }
            }
        },
        selectAll() {
            if (!this.disableSelectAllWatcher) {
                this.selectedMonitors = {};

                if (this.selectAll) {
                    this.selectableMonitors.forEach((item) => {
                        this.selectedMonitors[item.id] = true;
                    });
                }
            } else {
                this.disableSelectAllWatcher = false;
            }
        },
        selectMode() {
            if (!this.selectMode) {
                this.selectAll = false;
                this.selectedMonitors = {};
            }
        },
    },
    created() {
        this.rowRefs = new Map();
    },
    mounted() {
        this.$root.loadStatusSince();
        window.addEventListener("keydown", this.onKeydown);
        window.addEventListener("scroll", this.onListScroll, { passive: true });
        window.addEventListener("resize", this.onListScroll);
        this.onListScroll();
    },
    updated() {
        this.measureRows();
    },
    beforeUnmount() {
        window.removeEventListener("keydown", this.onKeydown);
        window.removeEventListener("scroll", this.onListScroll);
        window.removeEventListener("resize", this.onListScroll);
    },
    methods: {
        /**
         * Keep the reference to each mounted row so its real height can be measured
         * @param {object} el Row component instance
         * @param {number} id Monitor id
         * @returns {void}
         */
        setRowRef(el, id) {
            if (el) {
                this.rowRefs.set(id, el);
            } else {
                this.rowRefs.delete(id);
            }
        },
        /**
         * Read the real height of mounted rows (groups and tags change it)
         * @returns {void}
         */
        measureRows() {
            let changed = false;
            for (const [id, row] of this.rowRefs) {
                const el = row?.$el;
                if (!el) {
                    continue;
                }
                const height = el.offsetHeight;
                if (height > 0 && Math.abs((this.rowHeights[id] ?? 0) - height) > 1) {
                    this.rowHeights[id] = height;
                    changed = true;
                }
            }
            if (changed) {
                this.$nextTick(this.onListScroll);
            }
        },
        /**
         * Track where the viewport is over the list for windowing; the page scrolls, not the list
         * @returns {void}
         */
        onListScroll() {
            const el = this.$refs.monitorList;
            if (!el) {
                return;
            }
            this.scrollTop = Math.max(0, -el.getBoundingClientRect().top);
            this.viewportHeight = window.innerHeight;
        },

        /**
         * Esc leaves select mode
         * @param {KeyboardEvent} event Key event
         * @returns {void}
         */
        onKeydown(event) {
            if (event.key === "Escape" && this.selectMode) {
                this.cancelSelectMode();
            }
        },
        toggleSelectAll() {
            this.selectAll = !this.selectAll;
            if (!this.selectAll) {
                this.selectedMonitors = {};
            }
        },
        /**
         * Remove one kind of filter
         * @param {string} key status, active or tags
         * @returns {void}
         */
        clearFilter(key) {
            this.filterState = { ...this.filterState, [key]: null };
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
         * Clear the search bar
         * @returns {void}
         */
        clearSearchText() {
            this.searchText = "";
        },
        /**
         * Update the MonitorList Filter
         * @param {object} newFilter Object with new filter
         * @returns {void}
         */
        updateFilter(newFilter) {
            this.filterState = newFilter;
        },
        /**
         * Toggle collapse state for all group monitors
         * If collapsing all groups while viewing a nested group, navigate to its root parent
         * @returns {void}
         */
        toggleCollapseAll() {
            const shouldCollapse = !this.allGroupsCollapsed;

            let storageObject = {};
            const storage = window.localStorage.getItem("monitorCollapsed");
            if (storage !== null) {
                storageObject = JSON.parse(storage);
            }

            this.groupMonitors.forEach((group) => {
                storageObject[`monitor_${group.id}`] = shouldCollapse;
            });

            window.localStorage.setItem("monitorCollapsed", JSON.stringify(storageObject));

            // If collapsing all and currently viewing a nested group, navigate to root parent
            if (shouldCollapse) {
                const currentMonitorId = parseInt(this.$route.params.id);
                const currentMonitor = this.$root.monitorList[currentMonitorId];

                if (currentMonitor && currentMonitor.parent !== null) {
                    // Find the root parent by traversing up the hierarchy
                    let rootParentId = currentMonitor.parent;
                    let rootParent = this.$root.monitorList[rootParentId];

                    while (rootParent && rootParent.parent !== null) {
                        rootParentId = rootParent.parent;
                        rootParent = this.$root.monitorList[rootParentId];
                    }

                    // Navigate to the root parent, then increment collapseKey to force re-render
                    this.$router.push(getMonitorRelativeURL(rootParentId)).finally(() => {
                        this.collapseKey++;
                    });
                    return;
                }
            }

            this.collapseKey++;
        },
        /**
         * Deselect a monitor
         * @param {number} id ID of monitor
         * @returns {void}
         */
        deselect(id) {
            delete this.selectedMonitors[id];
        },
        /**
         * Select a monitor
         * @param {number} id ID of monitor
         * @returns {void}
         */
        select(id) {
            this.selectMode = true;
            this.selectedMonitors[id] = true;
        },
        /**
         * Determine if monitor is selected
         * @param {number} id ID of monitor
         * @returns {bool} Is the monitor selected?
         */
        isSelected(id) {
            return id in this.selectedMonitors;
        },
        /**
         * Disable select mode and reset selection
         * @returns {void}
         */
        cancelSelectMode() {
            this.selectMode = false;
            this.selectedMonitors = {};
        },
        /**
         * Show dialog to confirm pause
         * @returns {void}
         */
        pauseDialog() {
            this.pauseId = null;
            this.$refs.confirmPause.show();
        },
        /**
         * Ask before pausing one monitor
         * @param {number} id ID of monitor
         * @returns {void}
         */
        pauseOne(id) {
            this.pauseId = id;
            this.$refs.confirmPause.show();
        },
        /**
         * Pause the one monitor asked for, or the selected ones
         * @returns {void}
         */
        onPauseConfirmed() {
            if (this.pauseId == null) {
                this.pauseSelected();
                return;
            }
            this.$root.getSocket().emit("pauseMonitor", this.pauseId, (res) => this.$root.toastRes(res));
            this.pauseId = null;
        },
        /**
         * Pause each selected monitor
         * @returns {void}
         */
        pauseSelected() {
            if (this.bulkActionInProgress) {
                return;
            }

            const activeMonitors = Object.keys(this.selectedMonitors).filter((id) => this.$root.monitorList[id].active);

            if (activeMonitors.length === 0) {
                this.$root.toastError(this.$t("noMonitorsPausedMsg"));
                return;
            }

            this.bulkActionInProgress = true;
            activeMonitors.forEach((id) => this.$root.getSocket().emit("pauseMonitor", id, () => {}));
            this.$root.toastSuccess(this.$t("pausedMonitorsMsg", activeMonitors.length));
            this.bulkActionInProgress = false;
            this.cancelSelectMode();
        },
        /**
         * Resume each selected monitor
         * @returns {void}
         */
        resumeSelected() {
            if (this.bulkActionInProgress) {
                return;
            }

            const inactiveMonitors = Object.keys(this.selectedMonitors).filter(
                (id) => !this.$root.monitorList[id].active
            );

            if (inactiveMonitors.length === 0) {
                this.$root.toastError(this.$t("noMonitorsResumedMsg"));
                return;
            }

            this.bulkActionInProgress = true;
            inactiveMonitors.forEach((id) => this.$root.getSocket().emit("resumeMonitor", id, () => {}));
            this.$root.toastSuccess(this.$t("resumedMonitorsMsg", inactiveMonitors.length));
            this.bulkActionInProgress = false;
            this.cancelSelectMode();
        },
        /**
         * Delete each selected monitor
         * @returns {Promise<void>}
         */
        async deleteSelected() {
            if (this.bulkActionInProgress) {
                return;
            }

            const monitorIds = Object.keys(this.selectedMonitors);

            this.bulkActionInProgress = true;
            let successCount = 0;
            let errorCount = 0;

            for (const id of monitorIds) {
                try {
                    await new Promise((resolve, reject) => {
                        this.$root.getSocket().emit("deleteMonitor", id, false, (res) => {
                            if (res.ok) {
                                successCount++;
                                resolve();
                            } else {
                                errorCount++;
                                reject();
                            }
                        });
                    });
                } catch (error) {
                    // Error already counted
                }
            }

            this.bulkActionInProgress = false;

            if (successCount > 0) {
                this.$root.toastSuccess(this.$t("deletedMonitorsMsg", successCount));
            }
            if (errorCount > 0) {
                this.$root.toastError(this.$t("bulkDeleteErrorMsg", errorCount));
            }

            this.cancelSelectMode();
        },
        /**
         * Whether a monitor should be displayed based on the filters
         * @param {object} monitor Monitor to check
         * @returns {boolean} Should the monitor be displayed
         */
        filterFunc(monitor) {
            // Group monitors bypass filter if at least 1 of children matched
            if (monitor.type === "group") {
                const children = this.childrenByParent.get(monitor.id) ?? [];
                if (children.some((child) => this.filterFunc(child))) {
                    return true;
                }
            }

            // filter by search text
            // finds monitor name, tag name or tag value
            let searchTextMatch = true;
            if (this.searchText !== "") {
                const loweredSearchText = this.searchText.toLowerCase();
                searchTextMatch =
                    monitor.name.toLowerCase().includes(loweredSearchText) ||
                    monitor.tags.find(
                        (tag) =>
                            tag.name.toLowerCase().includes(loweredSearchText) ||
                            tag.value?.toLowerCase().includes(loweredSearchText)
                    );
            }

            // filter by status
            let statusMatch = true;
            if (this.filterState.status != null && this.filterState.status.length > 0) {
                if (!monitor.active) {
                    monitor.status = null;
                } else {
                    monitor.status = this.$root.lastHeartbeatList[monitor.id]?.status;
                }
                statusMatch = this.filterState.status.includes(monitor.status);
            }

            // filter by active
            let activeMatch = true;
            if (this.filterState.active != null && this.filterState.active.length > 0) {
                activeMatch = this.filterState.active.includes(monitor.active);
            }

            // filter by tags
            let tagsMatch = true;
            if (this.filterState.tags != null && this.filterState.tags.length > 0) {
                tagsMatch =
                    monitor.tags
                        .map((tag) => tag.tag_id) // convert to array of tag IDs
                        .filter((monitorTagId) => this.filterState.tags.includes(monitorTagId)).length > 0; // perform Array Intersaction between filter and monitor's tags
            }

            // filter by tab
            let tabMatch = true;
            if (this.tab === "down") {
                tabMatch = this.$root.lastHeartbeatList[monitor.id]?.status === DOWN;
            } else if (this.tab === "push") {
                tabMatch = monitor.type === "push";
            } else if (this.tab === "paused") {
                tabMatch = !monitor.active;
            }

            return searchTextMatch && statusMatch && activeMatch && tagsMatch && tabMatch;
        },
        /**
         * Function used in Array.sort to order monitors in a list.
         * @param {*} m1 monitor 1
         * @param {*} m2 monitor 2
         * @returns {number} -1, 0 or 1
         */
        sortFunc(m1, m2) {
            if (!m1 || !m2) {
                return 0;
            }
            // A monitor may be added before its name arrives (e.g. optimistic update)
            const name1 = typeof m1.name === "string" ? m1.name : "";
            const name2 = typeof m2.name === "string" ? m2.name : "";
            if (m1.active !== m2.active) {
                if (m1.active === false) {
                    return 1;
                }

                if (m2.active === false) {
                    return -1;
                }
            }

            if (m1.weight !== m2.weight) {
                if (m1.weight > m2.weight) {
                    return -1;
                }

                if (m1.weight < m2.weight) {
                    return 1;
                }
            }

            return name1.localeCompare(name2);
        },
    },
};
</script>

<style lang="scss" scoped>
.list-loading {
    padding: 10px 4px;
}

.skeleton-row {
    height: 48px;
    margin-bottom: 8px;
    border-radius: 8px;
    background: linear-gradient(90deg, rgba(128, 128, 128, 0.08), rgba(128, 128, 128, 0.18), rgba(128, 128, 128, 0.08));
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.2s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}
</style>
