<template>
    <div class="carbon-page">
        <div class="carbon-top">
            <h1>{{ $t("Status pages") }}</h1>
            <div class="carbon-tools">
                <router-link to="/add-status-page" class="btn btn-primary">{{ $t("New status page") }}</router-link>
            </div>
        </div>

        <template v-if="$root.statusPageListLoaded">
            <EmptyState
                v-if="Object.keys($root.statusPageList).length === 0"
                illustration="semaphore"
                :title="$t('No status pages yet')"
                class="mt-4"
            >
                {{ $t("statusPagesEmptyHelp") }}
            </EmptyState>

            <div v-else class="mt-3">
                <!-- use <a> instead of <router-link>, because the heartbeat won't load. -->
                <a
                    v-for="statusPage in $root.statusPageList"
                    :key="statusPage.slug"
                    :href="'/status/' + statusPage.slug"
                    class="carbon-event carbon-row-link carbon-linkrow"
                >
                    <img :src="icon(statusPage.icon)" alt="" class="carbon-status-icon" />
                    <span class="text">
                        {{ statusPage.title }}
                        <span class="sub carbon-mono">/status/{{ statusPage.slug }}</span>
                    </span>
                    <span class="when">
                        <button
                            type="button"
                            class="carbon-quiet delete-status-page"
                            @click.stop.prevent="deleteDialog(statusPage.slug)"
                        >
                            {{ $t("Delete") }}
                        </button>
                    </span>
                </a>
            </div>
        </template>
        <p v-else class="carbon-muted mt-4">{{ $t("Loading…") }}</p>
    </div>
    <Confirm
        ref="confirmDelete"
        btn-style="btn-danger"
        :yes-text="$t('Yes')"
        :no-text="$t('No')"
        @yes="deleteStatusPage"
    >
        {{ $t("deleteStatusPageMsg") }}
    </Confirm>
</template>

<script>
import EmptyState from "../components/EmptyState.vue";
import Confirm from "../components/Confirm.vue";
import { getResBaseURL } from "../util-frontend";

export default {
    components: {
        EmptyState,
        Confirm,
    },
    props: {
        calculatedHeight: {
            type: Number,
            default: 0,
        },
    },
    data() {
        return {
            selectedStatusSlug: "",
        };
    },
    computed: {},
    mounted() {},
    methods: {
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
        deleteDialog(slug) {
            this.$data.selectedStatusSlug = slug;
            this.$refs.confirmDelete.show();
        },
        deleteStatusPage() {
            this.$root.getSocket().emit("deleteStatusPage", this.$data.selectedStatusSlug, (res) => {
                if (res.ok) {
                    this.$root.toastSuccess(this.$t("successDeleted"));
                    window.location.reload();
                } else {
                    this.$root.toastError(res.msg);
                }
            });
        },
    },
};
</script>
