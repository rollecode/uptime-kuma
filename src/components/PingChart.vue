<template>
    <div class="carbon-chart">
        <div class="carbon-section-head">
            <h2>{{ $t("Response times") }}</h2>
            <div class="carbon-seg" role="group" :aria-label="$t('Time period')">
                <button
                    v-for="(label, key) in chartPeriodOptions"
                    :key="key"
                    type="button"
                    :class="{ 'is-on': chartPeriodHrs === key }"
                    @click="chartPeriodHrs = key"
                >
                    {{ label }}
                </button>
            </div>
        </div>
        <div v-if="hasData || loading" class="chart-wrapper" :class="{ loading: loading }">
            <Line :data="chartData" :options="chartOptions" />
        </div>
        <p v-else class="carbon-muted">{{ $t("noChartData") }}</p>
    </div>
</template>

<script lang="js">
import {
    BarController,
    BarElement,
    Chart,
    Filler,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    TimeScale,
    Tooltip,
    Legend,
} from "chart.js";
import "chartjs-adapter-dayjs-4";
import { Line } from "vue-chartjs";

Chart.register(
    LineController,
    BarController,
    LineElement,
    PointElement,
    TimeScale,
    BarElement,
    LinearScale,
    Tooltip,
    Filler,
    Legend
);

export default {
    components: { Line },
    props: {
        /** ID of monitor */
        monitorId: {
            type: Number,
            required: true,
        },
    },
    data() {
        return {
            loading: false,

            // Time period for the chart to display, in hours
            // Initial value is 0 as a workaround for triggering a data fetch on created()
            chartPeriodHrs: "0",

            chartPeriodOptions: {
                1: this.$t("Hour"),
                24: this.$t("Day"),
                168: this.$t("Week"),
                720: this.$t("Month"),
            },

            chartRawData: null,
            rangeEnd: Date.now(),
            chartDataFetchInterval: null,
        };
    },
    computed: {
        /**
         * Theme colours for the chart, read from the Carbon tokens
         * @returns {object} Colours
         */
        colors() {
            // Recompute when the theme changes
            this.$root.theme;
            const el = document.querySelector(".carbon") ?? document.body;
            const style = getComputedStyle(el);
            const token = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
            return {
                line: token("--c-data", "#8b8cf8"),
                grid: token("--c-line", "rgba(127,127,127,0.15)"),
                tick: token("--c-tick", "#7c7c82"),
                fg: token("--c-fg", "#ededed"),
                surface: token("--c-field", "#0d0d0f"),
                border: token("--c-line-strong", "#1f1f23"),
                down: token("--c-down", "#ff7369"),
                pending: token("--c-pending", "#f5b54a"),
                maintenance: token("--c-maintenance", "#5b8def"),
            };
        },

        hasData() {
            return this.chartData.datasets[0].data.some((point) => point.y != null);
        },

        chartOptions() {
            const c = this.colors;
            const font = { family: "'Geist Variable', system-ui, sans-serif", size: 11 };
            const hours = parseInt(this.chartPeriodHrs) || 24;
            const end = this.rangeEnd;
            return {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                transitions: { active: { animation: { duration: 0 } }, resize: { animation: { duration: 0 } } },
                interaction: { mode: "index", intersect: false },
                layout: { padding: { top: 8, right: 4 } },
                elements: {
                    point: { radius: 0, hoverRadius: 3, hitRadius: 8 },
                },
                scales: {
                    x: {
                        type: "time",
                        // The whole period, from its start to now, whatever data there is
                        min: end - hours * 3600 * 1000,
                        max: end,
                        time: {
                            unit: hours > 24 ? "day" : undefined,
                            minUnit: "minute",
                            round: "second",
                            tooltipFormat: "D.M. HH:mm",
                            displayFormats: { minute: "HH:mm", hour: "HH:mm", day: "D.M." },
                        },
                        border: { display: false },
                        grid: { display: false },
                        ticks: { color: c.tick, font, maxRotation: 0, autoSkipPadding: 40 },
                    },
                    y: {
                        beginAtZero: true,
                        border: { display: false },
                        grid: { color: c.grid },
                        ticks: { color: c.tick, font, maxTicksLimit: 5, callback: (value) => `${value} ms` },
                    },
                    // Down, pending and maintenance marks: a thin strip along the bottom
                    y1: { display: false, min: 0, max: 16 },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: c.surface,
                        borderColor: c.border,
                        borderWidth: 1,
                        titleColor: c.tick,
                        bodyColor: c.fg,
                        titleFont: font,
                        bodyFont: { ...font, size: 12 },
                        padding: 10,
                        displayColors: false,
                        filter: (item) => item.dataset.type !== "bar",
                        callbacks: {
                            label: (context) => `${new Intl.NumberFormat().format(Math.round(context.parsed.y))} ms`,
                        },
                    },
                },
            };
        },
        chartData() {
            return this.getChartDatapointsFromStats();
        },
    },
    watch: {
        // Update chart data when the selected chart period changes
        chartPeriodHrs: function (newPeriod) {
            if (this.chartDataFetchInterval) {
                clearInterval(this.chartDataFetchInterval);
                this.chartDataFetchInterval = null;
            }

            this.loading = true;

            const period = parseInt(newPeriod) || 24;

            this.$root.getMonitorChartData(this.monitorId, period, (res) => {
                if (!res.ok) {
                    this.$root.toastError(res.msg);
                } else {
                    this.chartRawData = res.data;
                    this.rangeEnd = Date.now();
                    this.$root.storage()["chart-period"] = newPeriod;
                }
                this.loading = false;
            });

            // Hour view is minute data, so it is worth refreshing more often
            const refresh = period <= 1 ? 60 * 1000 : 5 * 60 * 1000;
            this.chartDataFetchInterval = setInterval(() => {
                this.$root.getMonitorChartData(this.monitorId, period, (res) => {
                    if (res.ok) {
                        this.chartRawData = res.data;
                        this.rangeEnd = Date.now();
                    }
                });
            }, refresh);
        },
    },
    created() {
        // Load chart period from storage if saved
        const period = String(this.$root.storage()["chart-period"] ?? "24");
        this.chartPeriodHrs = period in this.chartPeriodOptions ? period : "24";
    },
    beforeUnmount() {
        if (this.chartDataFetchInterval) {
            clearInterval(this.chartDataFetchInterval);
        }
    },
    methods: {
        // Get color of bar chart for this datapoint
        getBarColorForDatapoint(datapoint) {
            if (datapoint.maintenance != null) {
                return this.colors.maintenance;
            } else if (datapoint.down === 0) {
                return "transparent";
            } else if (datapoint.up === 0) {
                return this.colors.down;
            }
            return this.colors.pending;
        },
        // push datapoint to chartData
        pushDatapoint(datapoint, avgPingData, minPingData, maxPingData, downData, colorData) {
            const x = this.$root.unixToDateTime(datapoint.timestamp);

            // Show ping values if it was up in this period
            avgPingData.push({
                x,
                y: datapoint.up > 0 && datapoint.avgPing != null ? datapoint.avgPing : null,
            });
            minPingData.push({
                x,
                y: datapoint.up > 0 && datapoint.avgPing != null ? datapoint.minPing : null,
            });
            maxPingData.push({
                x,
                y: datapoint.up > 0 && datapoint.avgPing != null ? datapoint.maxPing : null,
            });
            downData.push({
                x,
                y: datapoint.down + (datapoint.maintenance || 0) > 0 ? 1 : null,
            });

            colorData.push(this.getBarColorForDatapoint(datapoint));
        },
        // get the average of a set of datapoints
        getAverage(datapoints) {
            const totalUp = datapoints.reduce((total, current) => total + current.up, 0);
            const totalDown = datapoints.reduce((total, current) => total + current.down, 0);
            const totalMaintenance = datapoints.reduce((total, current) => total + (current.maintenance || 0), 0);
            const totalPing = datapoints.reduce((total, current) => total + current.avgPing * current.up, 0);
            const minPing = datapoints.reduce((min, current) => Math.min(min, current.minPing), Infinity);
            const maxPing = datapoints.reduce((max, current) => Math.max(max, current.maxPing), 0);

            // Find the middle timestamp to use
            let midpoint = Math.floor(datapoints.length / 2);

            return {
                timestamp: datapoints[midpoint].timestamp,
                up: totalUp,
                down: totalDown,
                maintenance: totalMaintenance > 0 ? totalMaintenance : undefined,
                avgPing: totalUp > 0 ? totalPing / totalUp : 0,
                minPing,
                maxPing,
            };
        },
        getChartDatapointsFromStats() {
            // Render chart using UptimeCalculator data
            let lastHeartbeatTime;
            const monitorInterval = this.$root.monitorList[this.monitorId]?.interval;

            let avgPingData = []; // Ping Data for Line Chart, y-axis contains ping time
            let minPingData = []; // Ping Data for Line Chart, y-axis contains ping time
            let maxPingData = []; // Ping Data for Line Chart, y-axis contains ping time
            let downData = []; // Down Data for Bar Chart, y-axis is number of down datapoints in this period
            let colorData = []; // Color Data for Bar Chart

            const period = parseInt(this.chartPeriodHrs);
            let aggregatePoints = period > 6 ? 12 : 4;

            let aggregateBuffer = [];

            if (this.chartRawData) {
                for (const datapoint of this.chartRawData) {
                    // Empty datapoints are ignored
                    if (datapoint.up === 0 && datapoint.down === 0 && datapoint.maintenance === 0) {
                        continue;
                    }

                    const beatTime = this.$root.unixToDayjs(datapoint.timestamp);

                    // Insert empty datapoint to separate big gaps
                    if (lastHeartbeatTime && monitorInterval) {
                        const diff = Math.abs(beatTime.diff(lastHeartbeatTime));
                        const oneSecond = 1000;
                        const oneMinute = oneSecond * 60;
                        const oneHour = oneMinute * 60;
                        if (
                            (period <= 24 && diff > Math.max(oneMinute * 10, monitorInterval * oneSecond * 10)) ||
                            (period > 24 && diff > Math.max(oneHour * 10, monitorInterval * oneSecond * 10))
                        ) {
                            // Big gap detected
                            // Clear the aggregate buffer
                            if (aggregateBuffer.length > 0) {
                                const average = this.getAverage(aggregateBuffer);
                                this.pushDatapoint(average, avgPingData, minPingData, maxPingData, downData, colorData);
                                aggregateBuffer = [];
                            }

                            const gapX = [
                                lastHeartbeatTime.subtract(monitorInterval, "second").format("YYYY-MM-DD HH:mm:ss"),
                                this.$root.unixToDateTime(datapoint.timestamp + 60),
                            ];

                            for (const x of gapX) {
                                avgPingData.push({
                                    x,
                                    y: null,
                                });
                                minPingData.push({
                                    x,
                                    y: null,
                                });
                                maxPingData.push({
                                    x,
                                    y: null,
                                });
                                downData.push({
                                    x,
                                    y: null,
                                });
                                colorData.push("#000");
                            }
                        }
                    }

                    if (datapoint.up > 0 && this.chartRawData.length > aggregatePoints * 2) {
                        // Aggregate Up data using a sliding window
                        aggregateBuffer.push(datapoint);

                        if (aggregateBuffer.length === aggregatePoints) {
                            const average = this.getAverage(aggregateBuffer);
                            this.pushDatapoint(average, avgPingData, minPingData, maxPingData, downData, colorData);
                            // Remove the first half of the buffer
                            aggregateBuffer = aggregateBuffer.slice(Math.floor(aggregatePoints / 2));
                        }
                    } else {
                        // datapoint is fully down or too few datapoints, no need to aggregate
                        // Clear the aggregate buffer
                        if (aggregateBuffer.length > 0) {
                            const average = this.getAverage(aggregateBuffer);
                            this.pushDatapoint(average, avgPingData, minPingData, maxPingData, downData, colorData);
                            aggregateBuffer = [];
                        }

                        this.pushDatapoint(datapoint, avgPingData, minPingData, maxPingData, downData, colorData);
                    }

                    lastHeartbeatTime = beatTime;
                }
                // Clear the aggregate buffer if there are still datapoints
                if (aggregateBuffer.length > 0) {
                    const average = this.getAverage(aggregateBuffer);
                    this.pushDatapoint(average, avgPingData, minPingData, maxPingData, downData, colorData);
                    aggregateBuffer = [];
                }
            }

            return {
                datasets: [
                    {
                        data: avgPingData,
                        fill: "origin",
                        tension: 0,
                        borderWidth: 1.5,
                        borderColor: this.colors.line,
                        // Hex colour plus 15% alpha
                        backgroundColor: `${this.colors.line}26`,
                        yAxisID: "y",
                        label: this.$t("avgPing"),
                    },
                    {
                        type: "bar",
                        data: downData,
                        borderColor: "transparent",
                        backgroundColor: colorData,
                        yAxisID: "y1",
                        barThickness: "flex",
                        barPercentage: 1,
                        categoryPercentage: 1,
                        label: "status",
                    },
                ],
            };
        },
    },
};
</script>

<style lang="scss" scoped>
.chart-wrapper {
    position: relative;
    height: 220px;

    &.loading {
        opacity: 0.4;
    }
}
</style>
