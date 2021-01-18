import qs from 'querystring';

export default {
  async onStart(request) {
    if (this.client.refreshing) await this.client.refreshPromise;

    request.headers.set(
      'Authorization',
      `Bearer ${this.client.getBearerToken()}`
    );

    return request;
  },

  async onComplete(request, response, clonedRequest) {
    if (response.status === 401) {
      if (!this.client.refreshing) {
        const refreshToken = this.client.getRefreshToken();

        this.client.refreshing = true;

        this.client.refreshPromise = this.helpers
          .refreshToken(this.client.oauthConfig, refreshToken)
          .then(async (response) => {
            if (response.status === 200) {
              this.client.usedRefreshTokens.push(refreshToken);
              const json = await response.json();
              await this.client.onRefreshResponse(json);
            }
            this.client.refreshing = false;
            return response;
          });
      }

      const refreshResponse = await this.client.refreshPromise;

      if (refreshResponse.status === 200) {
        return this.client.fetch(clonedRequest);
      }
    }

    return response;
  },

  helpers: {
    setConfig(config = {}) {
      this.oauthConfig = config;
    },

    refreshToken(oauthConfig, refreshToken) {
      const tokenRequest = new Request(oauthConfig.refresh_path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: qs.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: oauthConfig.client_id,
        }),
      });

      return fetch(tokenRequest);
    },

    setBearerTokenGetter(func) {
      this.getBearerToken = func;
    },

    getBearerToken() {
      throw new Error(
        'You must define getBearerToken with client.helpers.setBearerTokenGetter'
      );
    },

    setRefreshTokenGetter(func) {
      this.getRefreshToken = func;
    },

    setOnRefreshResponse(func) {
      this.onRefreshResponse = func;
    },

    setUsedRefreshTokens(value) {
      this.usedRefreshTokens = value || [];
    },
  },
};
