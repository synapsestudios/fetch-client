import qs from 'querystring';
const TOKEN_REFRESHED = 'TOKEN_REFRESHED';

export default {
  onStart(request) {
    if (this.refreshing) {
      request.waitPromise = new Promise(resolve => {
        this.client.eventEmitter.once(TOKEN_REFRESHED, () => {
          request.headers.append('Authorization', `Bearer ${this.client.getBearerToken()}`);
          resolve();
        });
      });
    } else {
      request.headers.append('Authorization', `Bearer ${this.client.getBearerToken()}`);
    }
    return request;
  },

  onComplete(request, response) {
    if (response.status === 401) {
      this.refreshing = true;
      response.doOver = this.client.refreshToken().then(() => {
        this.refreshing = false;
        this.client.eventEmitter.emit(TOKEN_REFRESHED);
      });
    }
    return response;
  },

  helpers: {
    setConfig(config = {}) {
      this.oauthConfig = config;
    },

    refreshToken() {
      return this.client.fetch(this.client.oauthConfig.refresh_path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: qs.stringify({
          grant_type: 'refresh_token',
          refresh_token: this.client.getRefreshToken(),
          client_id: this.client.oauthConfig.client_id,
        }),
      });
    },

    setBearerTokenGetter(func) {
      this.getBearerToken = func;
    },

    getBearerToken() {
      throw new Error(
        'You must define getBearerToken with client.helpers.setBearerTokenGetter'
      );
    },
  },
};
