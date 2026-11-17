<template>
    <div class="dropdown">
        <!-- No :class here: Bootstrap keeps the open state in the class attribute -->
        <button
            type="button"
            class="carbon-tool"
            data-testid="filter-status"
            :data-filtered="numFiltersActive > 0"
            data-bs-toggle="dropdown"
            data-bs-auto-close="outside"
            aria-expanded="false"
            @click="getExistingTags"
        >
            <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M3 5h18l-7 8v6l-4 2v-8z" />
            </svg>
            {{ $t("Filter") }}
        </button>
        <ul class="dropdown-menu dropdown-menu-end carbon-menu">
            <li class="carbon-menu-heading">{{ $t("Status") }}</li>
            <li v-for="row in statusRows" :key="row.status">
                <button
                    type="button"
                    class="dropdown-item"
                    :data-testid="'filter-status-' + row.key"
                    :aria-pressed="!!filterState.status?.includes(row.status)"
                    @click="toggleStatusFilter(row.status)"
                >
                    <span class="carbon-dot" :class="row.key" aria-hidden="true"><i /></span>
                    {{ row.label }}
                    <span class="count">{{ row.count }}</span>
                    <input
                        class="form-check-input menu-check"
                        type="checkbox"
                        tabindex="-1"
                        aria-hidden="true"
                        :checked="!!filterState.status?.includes(row.status)"
                    />
                </button>
            </li>
            <li><hr class="dropdown-divider" /></li>
            <li class="carbon-menu-heading">{{ $t("State") }}</li>
            <li v-for="row in stateRows" :key="String(row.active)">
                <button
                    type="button"
                    class="dropdown-item"
                    :data-testid="row.active ? 'filter-active-running' : 'filter-active-paused'"
                    :aria-pressed="!!filterState.active?.includes(row.active)"
                    @click="toggleActiveFilter(row.active)"
                >
                    <span class="carbon-dot" :class="row.key" aria-hidden="true"><i /></span>
                    {{ row.label }}
                    <span class="count">{{ row.count }}</span>
                    <input
                        class="form-check-input menu-check"
                        type="checkbox"
                        tabindex="-1"
                        aria-hidden="true"
                        :checked="!!filterState.active?.includes(row.active)"
                    />
                </button>
            </li>
            <template v-if="tagsList.length > 0">
                <li><hr class="dropdown-divider" /></li>
                <li class="carbon-menu-heading">{{ $t("Tags") }}</li>
                <li v-for="tag in tagsList" :key="tag.id">
                    <button
                        type="button"
                        class="dropdown-item"
                        :data-testid="'filter-tag-' + tag.id"
                        :aria-pressed="!!filterState.tags?.includes(tag.id)"
                        @click="toggleTagFilter(tag)"
                    >
                        <span class="carbon-dot" :style="{ '--dot': tag.color }" aria-hidden="true"><i /></span>
                        <span class="text-truncate">{{ tag.name }}</span>
                        <span class="count">{{ getTaggedMonitorCount(tag) }}</span>
                        <input
                            class="form-check-input menu-check"
                            type="checkbox"
                            tabindex="-1"
                            aria-hidden="true"
                            :checked="!!filterState.tags?.includes(tag.id)"
                        />
                    </button>
                </li>
            </template>
        </ul>
    </div>
    <button
        v-if="hasGroups"
        type="button"
        class="carbon-tool carbon-tool-icon"
        data-testid="collapse-all"
        :title="allCollapsed ? $t('Expand All Groups') : $t('Collapse All Groups')"
        :aria-label="allCollapsed ? $t('Expand All Groups') : $t('Collapse All Groups')"
        @click="$emit('toggle-collapse-all')"
    >
        <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path v-if="allCollapsed" d="m7 15 5 5 5-5M7 9l5-5 5 5" />
            <path v-else d="m7 20 5-5 5 5M7 4l5 5 5-5" />
        </svg>
    </button>
</template>

<script>
import { UP, DOWN, PENDING, MAINTENANCE } from "../util.ts";

export default {
    props: {
        filterState: {
            type: Object,
            required: true,
        },
        allCollapsed: {
            type: Boolean,
            default: true,
        },
        hasGroups: {
            type: Boolean,
            default: false,
        },
    },
    emits: ["updateFilter", "toggle-collapse-all"],
    data() {
        return {
            tagsList: [],
        };
    },
    computed: {
        statusRows() {
            const s = this.$root.checkSummary;
            return [
                { status: UP, key: "up", label: this.$t("Up"), count: s.up },
                { status: DOWN, key: "down", label: this.$t("Down"), count: s.down },
                { status: PENDING, key: "pending", label: this.$t("Pending"), count: s.pending },
                { status: MAINTENANCE, key: "maintenance", label: this.$t("statusMaintenance"), count: s.maintenance },
            ];
        },
        stateRows() {
            const s = this.$root.checkSummary;
            return [
                { active: true, key: "up", label: this.$t("Active"), count: s.total - s.paused },
                { active: false, key: "paused", label: this.$t("filterActivePaused"), count: s.paused },
            ];
        },
        numFiltersActive() {
            let num = 0;

            Object.values(this.filterState).forEach((item) => {
                if (item != null && item.length > 0) {
                    num += 1;
                }
            });

            return num;
        },
    },
    methods: {
        toggleStatusFilter(status) {
            let newFilter = {
                ...this.filterState,
            };

            if (newFilter.status == null) {
                newFilter.status = [status];
            } else {
                if (newFilter.status.includes(status)) {
                    newFilter.status = newFilter.status.filter((item) => item !== status);
                } else {
                    newFilter.status.push(status);
                }
            }
            this.$emit("updateFilter", newFilter);
        },
        toggleActiveFilter(active) {
            let newFilter = {
                ...this.filterState,
            };

            if (newFilter.active == null) {
                newFilter.active = [active];
            } else {
                if (newFilter.active.includes(active)) {
                    newFilter.active = newFilter.active.filter((item) => item !== active);
                } else {
                    newFilter.active.push(active);
                }
            }
            this.$emit("updateFilter", newFilter);
        },
        toggleTagFilter(tag) {
            let newFilter = {
                ...this.filterState,
            };

            if (newFilter.tags == null) {
                newFilter.tags = [tag.id];
            } else {
                if (newFilter.tags.includes(tag.id)) {
                    newFilter.tags = newFilter.tags.filter((item) => item !== tag.id);
                } else {
                    newFilter.tags.push(tag.id);
                }
            }
            this.$emit("updateFilter", newFilter);
        },
        clearFilters() {
            this.$emit("updateFilter", {
                status: null,
            });
        },
        getExistingTags() {
            this.$root.getSocket().emit("getTags", (res) => {
                if (res.ok) {
                    this.tagsList = res.tags;
                }
            });
        },
        getTaggedMonitorCount(tag) {
            return Object.values(this.$root.monitorList).filter((monitor) => {
                return monitor.tags.find((monitorTag) => monitorTag.tag_id === tag.id);
            }).length;
        },
    },
};
</script>
