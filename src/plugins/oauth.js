import qs from 'querystring';
const TOKEN_REFRESHED = 'TOKEN_REFRESHED';
const TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED';

export default {
  onStart(request) {
    if (this.client.refreshing) {
      request.secondTry = true;
      request.waitPromise = new Promise(resolve => {
        this.client.eventEmitter.once(TOKEN_REFRESHED, () => {
          request.headers.append('Authorization', `Bearer ${this.client.getBearerToken()}`);
          resolve();
        });
        this.client.eventEmitter.once(TOKEN_REFRESH_FAILED, () => resolve());
      });
    } else {
      request.headers.append('Authorization', `Bearer ${this.client.getBearerToken()}`);
    }
    return request;
  },

  onComplete(request, response) {
    const usedRefreshTokens = this.client.usedRefreshTokens;
    const currentRefreshToken = this.client.getRefreshToken();

    if (response.status === 401 && !usedRefreshTokens.includes(currentRefreshToken)) {
      this.client.refreshing = true;
      response.doOver = this.helpers.refreshToken(
        this.client.oauthConfig,
        this.client.getRefreshToken,
      )
        .then(async (res) => {
          this.client.refreshing = false;
          if (res.status === 200) {
            this.client.usedRefreshTokens.push(currentRefreshToken);
            this.client.eventEmitter.emit(TOKEN_REFRESHED);
            const tokenRefreshResponse = await res.json();
            await this.client.onRefreshResponse(tokenRefreshResponse);
            return true;
          } else {
            this.client.eventEmitter.emit(TOKEN_REFRESH_FAILED);
            return false;
          }
        });
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
