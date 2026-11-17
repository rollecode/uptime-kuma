<template>
    <div class="carbon-login">
        <div class="carbon-login-form">
            <div class="carbon-login-brand">
                <img src="/icon.svg" width="22" height="22" alt="" />
                Uptime Kuma
            </div>
            <h1>{{ tokenRequired ? $t("Two-factor code") : $t("Sign in") }}</h1>
            <p class="carbon-muted">{{ host }}</p>

            <form :aria-label="$t('Sign in')" @submit.prevent="submit">
                <template v-if="!tokenRequired">
                    <label for="floatingInput" class="form-label">{{ $t("Username") }}</label>
                    <input
                        id="floatingInput"
                        v-model="username"
                        type="text"
                        class="form-control"
                        autocomplete="username"
                        required
                    />

                    <label for="floatingPassword" class="form-label">{{ $t("Password") }}</label>
                    <div class="input-group">
                        <input
                            id="floatingPassword"
                            v-model="password"
                            :type="showPassword ? 'text' : 'password'"
                            class="form-control"
                            autocomplete="current-password"
                            required
                        />
                        <button
                            type="button"
                            class="btn btn-normal"
                            :aria-label="showPassword ? $t('Hide password') : $t('Show password')"
                            @click="showPassword = !showPassword"
                        >
                            <font-awesome-icon :icon="showPassword ? 'eye-slash' : 'eye'" />
                        </button>
                    </div>
                </template>

                <template v-else>
                    <label for="otp" class="form-label">{{ $t("twoFactorCodeHelp") }}</label>
                    <input
                        id="otp"
                        ref="otpInput"
                        v-model="token"
                        type="text"
                        inputmode="numeric"
                        maxlength="6"
                        class="form-control carbon-mono"
                        autocomplete="one-time-code"
                        required
                    />
                </template>

                <p v-if="res && !res.ok" class="carbon-error" role="alert">{{ $t(res.msg) }}</p>

                <div class="form-check">
                    <input id="remember" v-model="$root.remember" type="checkbox" class="form-check-input" />
                    <label class="form-check-label" for="remember">{{ $t("Remember me") }}</label>
                </div>

                <button class="btn btn-primary w-100" type="submit" :disabled="processing">
                    {{ $t("Login") }}
                </button>
            </form>
        </div>

        <figure class="carbon-login-art" aria-hidden="true">
            <img :src="ship" alt="" />
            <figcaption>{{ $t("loginArtCredit") }}</figcaption>
        </figure>
    </div>
</template>

<script>
import { login, verifyTotp } from "../auth-client";
import ship from "../assets/carbon/art/ship.webp";

export default {
    data() {
        return {
            ship,
            showPassword: false,
            processing: false,
            username: "",
            password: "",
            token: "",
            res: null,
            tokenRequired: false,
        };
    },

    computed: {
        host() {
            return location.host;
        },
    },

    watch: {
        tokenRequired(newVal) {
            if (newVal) {
                this.$nextTick(() => {
                    this.$refs.otpInput?.focus();
                });
            }
        },
    },

    mounted() {
        document.title += " - Login";
    },

    unmounted() {
        document.title = document.title.replace(" - Login", "");
    },

    methods: {
        /**
         * Submit the user details and attempt to log in
         * @returns {void}
         */
        async submit() {
            this.processing = true;

            try {
                if (this.tokenRequired) {
                    await verifyTotp(this.token);
                    return;
                }

                const result = await login(this.username, this.password, this.$root.remember);
                if (result === "twoFactorRequired") {
                    this.tokenRequired = true;
                }
            } catch (e) {
                this.res = { ok: false, msg: e.message };
            } finally {
                this.processing = false;
            }
        },
    },
};
</script>
