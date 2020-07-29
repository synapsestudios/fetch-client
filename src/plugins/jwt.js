import { AUTH_EXPIRED, AUTH_FAILED } from '../events';

const isExpired = (token) => {
  try {
    const tokenPayload = token.substring(
      token.indexOf('.') + 1,
      token.indexOf('.', token.indexOf('.') + 1)
    );

    const decodedPayload = JSON.parse(atob(tokenPayload));

    if (decodedPayload.exp < new Date().getTime() / 1000) {
      return true;
    }
  } catch (error) {
    // Swallow any JSON or base64 decoding errors
    return false;
  }

  return false;
};

class JwtPlugin {
  constructor() {
    this.helpers = {
      setJwtTokenGetter(func) {
        this.getJwtToken = func;
      },

      getJwtToken() {
        throw new Error(
          'You must define getJwtToken with client.helpers.setJwtTokenGetter'
        );
      },
    };
  }

  onStart(request) {
    const jwtToken = this.client.getJwtToken();
    if (jwtToken) {
      request.headers.append('Authorization', jwtToken);
    }
    return request;
  }

  onFail(request, response) {
    if (response.status === 401) {
      if (isExpired(this.client.getJwtToken())) {
        this.client.eventEmitter.emit(AUTH_EXPIRED, request, response);
      } else {
        this.client.eventEmitter.emit(AUTH_FAILED, request, response);
      }
    }
    return response;
  }
}

export default JwtPlugin;
