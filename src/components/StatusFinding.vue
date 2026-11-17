<template>
    <p class="carbon-finding">
        <!-- Kept on one line so no space lands before the colon -->
        <b v-if="finding.strong">{{ finding.strong }}</b>{{ finding.rest }}
        <slot />
    </p>
</template>

<script>
import dayjs from "dayjs";
import { shortDuration } from "../util-frontend";

/**
 * One sentence that says what is down and why, or that everything is up
 */
export default {
    computed: {
        finding() {
            const summary = this.$root.checkSummary;
            const down = summary.downList;

            if (down.length === 1) {
                const monitor = down[0];
                const since = this.$root.statusSince[monitor.id];
                const msg = this.$root.lastHeartbeatList[monitor.id]?.msg;
                let rest = "";
                if (since) {
                    rest += " " + this.$t("downForDuration", [shortDuration(dayjs().diff(dayjs.utc(since), "second"))]);
                }
                if (msg) {
                    rest += `: ${msg}`;
                }
                return { strong: this.$t("monitorIsDown", [monitor.name]), rest };
            }

            if (down.length > 1) {
                return {
                    strong: this.$t("monitorsAreDown", [down.length]),
                    rest: `: ${down.map((m) => m.name).join(", ")}`,
                };
            }

            const running = summary.total - summary.paused;
            if (summary.up === running) {
                return { strong: "", rest: this.$t("allMonitorsUp", [running]) };
            }
            return { strong: "", rest: this.$t("someMonitorsUp", [summary.up, running]) };
        },
    },
};
</script>
