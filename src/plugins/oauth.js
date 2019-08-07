import qs from 'querystring';

const TOKEN_REFRESHED = 'TOKEN_REFRESHED';
const TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED';

export default {
  async onStart(request) {
    if (this.client.refreshing) {
      request.secondTry = true;

      await new Promise(resolve => {
        this.client.eventEmitter.once(TOKEN_REFRESHED, () => {
          request.headers.set('Authorization', `Bearer ${this.client.getBearerToken()}`);
          resolve();
        });
        this.client.eventEmitter.once(TOKEN_REFRESH_FAILED, () => resolve());
      });
    } else {
      request.headers.set('Authorization', `Bearer ${this.client.getBearerToken()}`);
    }
    return request;
  },

  async onComplete(request, response, clonedRequest) {
    const usedRefreshTokens = this.client.usedRefreshTokens;
    const currentRefreshToken = this.client.getRefreshToken();

    if (this.client.refreshing) {
      const refreshResponse = await this.client.refreshPromise;
      if (refreshResponse.status === 200) {
        return this.client.fetch(clonedRequest);
      }
    }

    if (
      !this.client.refreshing &&
      response.status === 401 &&
      !usedRefreshTokens.includes(currentRefreshToken)
    ) {
      this.client.refreshing = true;

      this.client.refreshPromise = this.helpers.refreshToken(
        this.client.oauthConfig,
        this.client.getRefreshToken
      );

      const refreshResponse = await this.client.refreshPromise;

      this.client.refreshing = false;

      if (refreshResponse.status === 200) {
        this.client.usedRefreshTokens.push(currentRefreshToken);
        this.client.eventEmitter.emit(TOKEN_REFRESHED);
        const tokenRefreshResponseBody = await refreshResponse.json();
        await this.client.onRefreshResponse(tokenRefreshResponseBody);
        return this.client.fetch(clonedRequest);
      }
      this.client.eventEmitter.emit(TOKEN_REFRESH_FAILED);
    }

    return response;
  },

  helpers: {
    setConfig(config = {}) {
      this.oauthConfig = config;
    },

    refreshToken(oauthConfig, getRefreshToken) {
      const tokenRequest = new Request(oauthConfig.refresh_path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: qs.stringify({
          grant_type: 'refresh_token',
          refresh_token: getRefreshToken(),
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
