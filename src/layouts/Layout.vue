<template>
    <div :class="classes">
        <div v-if="!$root.socket.connected && !$root.socket.firstConnect" class="lost-connection">
            <div class="container-fluid">
                {{ $root.connectionErrorMsg }}
                <div v-if="$root.showReverseProxyGuide">
                    {{ $t("Using a Reverse Proxy?") }}
                    <a href="https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy" target="_blank">
                        {{ $t("Check how to config it for WebSocket") }}
                    </a>
                </div>
            </div>
        </div>

        <!-- Desktop sidebar -->
        <aside v-if="!$root.isMobile && $root.loggedIn" class="carbon-sidebar" :aria-label="$t('Main')">
            <router-link to="/dashboard" class="carbon-brand">
                <img src="/icon.svg" width="22" height="22" alt="" />
                Uptime Kuma
            </router-link>
            <div class="carbon-scope">{{ host }}</div>

            <router-link to="/dashboard" class="carbon-nav" :class="{ 'is-on': section === 'overview' }">
                {{ $t("Overview") }}
            </router-link>
            <router-link to="/list" class="carbon-nav" :class="{ 'is-on': section === 'monitors' }">
                {{ $t("navMonitors") }}
                <span class="count">{{ $root.checkSummary.total }}</span>
            </router-link>
            <router-link to="/maintenance" class="carbon-nav" :class="{ 'is-on': section === 'maintenance' }">
                {{ $t("Maintenance") }}
            </router-link>
            <router-link to="/manage-status-page" class="carbon-nav" :class="{ 'is-on': section === 'status' }">
                {{ $t("navStatusPages") }}
            </router-link>
            <router-link
                to="/settings/notifications"
                class="carbon-nav"
                :class="{ 'is-on': section === 'notifications' }"
            >
                {{ $t("Notifications") }}
            </router-link>

            <div class="flex-grow-1" />

            <a
                v-if="hasNewVersion"
                target="_blank"
                href="https://github.com/louislam/uptime-kuma/releases"
                class="carbon-nav"
            >
                {{ $t("New Update") }}
            </a>
            <router-link to="/settings/general" class="carbon-nav" :class="{ 'is-on': section === 'settings' }">
                {{ $t("Settings") }}
            </router-link>

            <div class="dropup">
                <button type="button" class="carbon-nav carbon-user" data-bs-toggle="dropdown" aria-expanded="false">
                    <span class="avatar" aria-hidden="true">{{ $root.usernameFirstChar }}</span>
                    <span class="text-truncate">{{ $root.username ?? $t("signedInDispDisabled") }}</span>
                </button>
                <ul class="dropdown-menu">
                    <li v-if="$root.username != null">
                        <i18n-t tag="span" keypath="signedInDisp" class="dropdown-item-text">
                            <strong>{{ $root.username }}</strong>
                        </i18n-t>
                    </li>
                    <li>
                        <a href="https://github.com/louislam/uptime-kuma/wiki" class="dropdown-item" target="_blank">
                            {{ $t("Help") }}
                        </a>
                    </li>
                    <li v-if="$root.loggedIn">
                        <button class="dropdown-item" @click="$root.logout">
                            {{ $t("Logout") }}
                        </button>
                    </li>
                </ul>
            </div>
        </aside>

        <!-- Mobile header -->
        <header v-if="$root.isMobile && $root.loggedIn" class="carbon-mobile-header">
            <router-link to="/dashboard" class="carbon-brand">
                <img src="/icon.svg" width="22" height="22" alt="" />
                Uptime Kuma
            </router-link>
        </header>

        <main class="carbon-main">
            <router-view v-if="$root.loggedIn" />
            <Login v-if="!$root.loggedIn && $root.allowLoginDialog" />
        </main>

        <!-- Mobile Only -->
        <div v-if="$root.isMobile && $root.loggedIn" style="width: 100%; height: calc(60px + env(safe-area-inset-bottom))" />
        <nav v-if="$root.isMobile && $root.loggedIn" class="bottom-nav">
            <router-link to="/dashboard" class="nav-link" :class="{ 'is-on': section === 'overview' }">
                <div><font-awesome-icon icon="tachometer-alt" /></div>
                {{ $t("Overview") }}
            </router-link>

            <router-link to="/list" class="nav-link" :class="{ 'is-on': section === 'monitors' }">
                <div><font-awesome-icon icon="list" /></div>
                {{ $t("navMonitors") }}
            </router-link>

            <router-link to="/add" class="nav-link">
                <div><font-awesome-icon icon="plus" /></div>
                {{ $t("Add") }}
            </router-link>

            <router-link to="/settings" class="nav-link">
                <div><font-awesome-icon icon="cog" /></div>
                {{ $t("Settings") }}
            </router-link>
        </nav>

        <button
            v-if="numActiveToasts != 0"
            type="button"
            class="btn btn-normal clear-all-toast-btn"
            @click="clearToasts"
        >
            <font-awesome-icon icon="times" />
        </button>
    </div>
</template>

<script>
import Login from "../components/Login.vue";
import compareVersions from "compare-versions";
import { useToast } from "vue-toastification";
const toast = useToast();

export default {
    components: {
        Login,
    },

    data() {
        return {
            toastContainer: null,
            numActiveToasts: 0,
            toastContainerObserver: null,
        };
    },

    computed: {
        // Theme or Mobile
        classes() {
            const classes = {};
            classes[this.$root.theme] = true;
            classes["carbon"] = true;
            classes["has-sidebar"] = !this.$root.isMobile && this.$root.loggedIn;
            classes["mobile"] = this.$root.isMobile;
            return classes;
        },

        host() {
            return location.host;
        },

        /**
         * Which sidebar item the current page belongs to
         * @returns {string} Section name
         */
        section() {
            const path = this.$route.path;
            if (path === "/dashboard") {
                return "overview";
            }
            if (path.startsWith("/settings/notifications")) {
                return "notifications";
            }
            if (path.startsWith("/settings")) {
                return "settings";
            }
            if (path.includes("maintenance")) {
                return "maintenance";
            }
            if (path.includes("status-page")) {
                return "status";
            }
            return "monitors";
        },

        hasNewVersion() {
            if (this.$root.info.latestVersion && this.$root.info.version) {
                return compareVersions(this.$root.info.latestVersion, this.$root.info.version) >= 1;
            } else {
                return false;
            }
        },
    },

    watch: {},

    mounted() {
        this.toastContainer = document.querySelector(".bottom-right.toast-container");

        // Watch the number of active toasts
        this.toastContainerObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    this.numActiveToasts = mutation.target.children.length;
                }
            }
        });

        if (this.toastContainer != null) {
            this.toastContainerObserver.observe(this.toastContainer, { childList: true });
        }
    },

    beforeUnmount() {
        this.toastContainerObserver.disconnect();
    },

    methods: {
        /**
         * Clear all toast notifications.
         * @returns {void}
         */
        clearToasts() {
            toast.clear();
        },
    },
};
</script>

<style lang="scss" scoped>
.bottom-nav {
    z-index: 1000;
    position: fixed;
    bottom: 0;
    height: calc(60px + env(safe-area-inset-bottom));
    width: 100%;
    left: 0;
    text-align: center;
    white-space: nowrap;
    padding: 0 10px env(safe-area-inset-bottom);

    a {
        text-align: center;
        width: 25%;
        display: inline-block;
        height: 100%;
        padding: 8px 10px 0;
        font-size: 12px;
        overflow: hidden;
        text-decoration: none;

        div {
            font-size: 18px;
        }
    }
}

main {
    min-height: calc(100vh - 160px);
}

.lost-connection {
    padding: 5px;
    background-color: crimson;
    color: white;
    position: fixed;
    width: 100%;
    z-index: 99999;
}

.clear-all-toast-btn {
    position: fixed;
    right: 1em;
    bottom: 1em;
    font-size: 1.2em;
    padding: 9px 15px;
    width: 48px;
    box-shadow: 2px 2px 30px rgba(0, 0, 0, 0.2);
    z-index: 100;

    .dark & {
        box-shadow: 2px 2px 30px rgba(0, 0, 0, 0.5);
    }
}

@media (max-width: 770px) {
    .clear-all-toast-btn {
        bottom: 72px;
    }
}
</style>
