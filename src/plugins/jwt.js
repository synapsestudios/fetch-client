import { AUTH_EXPIRED, AUTH_FAILED } from '../events';

let getJwtToken = function getJwtToken() {
  throw new Error('You must define getJwtToken with client.helpers.setJwtTokenGetter');
};

const isExpired = (token) => {
  const tokenPayload = token.substring(
      token.indexOf('.') + 1,
      token.indexOf('.', token.indexOf('.') + 1)
  );
  const decodedPayload = JSON.parse(atob(tokenPayload));

  if (decodedPayload.exp < (new Date().getTime() / 1000)) {
    return true;
  }

  return false;
};

export default {
  onStart(request) {
    request.headers.append('Authorization', this.helpers.getJwtToken());
    return request;
  },

  onFail(request, response) {
    if (response.status === 401) {
      if (isExpired(this.helpers.getJwtToken())) {
        this.eventEmitter.emit(AUTH_EXPIRED);
      } else {
        this.eventEmitter.emit(AUTH_FAILED);
      }
    }
  },

  helpers: {
    setJwtTokenGetter: func => {
      getJwtToken = func;
    },

    getJwtToken,
  },
};
